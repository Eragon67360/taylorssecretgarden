import type { Page } from "@playwright/test";

import { existsSync } from "node:fs";

import { expectNoAxeViolations } from "./checks";
import { expect, test } from "./fixtures";
import { BOTID_HUMAN, MEMBER_STATE, newTestMember, readTestMember, writeGuard } from "./member";

// A Member's own page in the guestbook (/guestbook): their data as a
// download, and deleting their account.

test.describe("your guestbook page, signed out", () => {
  test("sends a visitor to sign in, and back after", async ({ page }) => {
    await page.goto("/guestbook");
    await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Fguestbook$/);
  });

  test("the export and account deletion are 401 without a session", async ({ request }) => {
    const exported = await request.get("/api/swiftter/me/export");

    expect(exported.status()).toBe(401);
    expect(exported.headers()["cache-control"]).toBe("private, no-store");
    expect((await request.delete("/api/swiftter/me", { headers: BOTID_HUMAN })).status()).toBe(401);
  });
});

/** Signs a fresh Member up through the guestbook form, retrying while Neon Auth limits a burst of sign-ups. */
async function signUpFresh(page: Page, name: string) {
  const member = newTestMember();

  await page.goto("/sign-up");
  await page.getByRole("textbox", { name: "Name" }).fill(name);
  await page.getByRole("textbox", { name: "Email" }).fill(member.email);
  await page.getByLabel("Password").fill(member.password);

  for (let attempt = 1; ; attempt++) {
    await page.getByRole("button", { name: "Sign the guestbook" }).click();
    const signedIn = await page
      .getByText(`writing as ${name}`)
      .waitFor({ timeout: 20_000 })
      .then(() => true)
      .catch(() => false);

    if (signedIn) return;
    if (attempt === 4) throw new Error(`Signing up ${name} did not finish at ${page.url()}`);
    if (page.url().endsWith("/swiftter")) await page.reload();
    else await page.waitForTimeout(15_000);
    if (await page.getByText(`writing as ${name}`).isVisible()) return;
  }
}

// Signs a Member up and deletes them, so only on a disposable Neon branch; a
// fresh Member, never the shared one the other tests use.
test.describe("your guestbook page, signed in", () => {
  test.skip(!!writeGuard(), writeGuard() ?? "");
  test.skip(() => !readTestMember(), "The setup project signs up the test Member");
  test.use({ storageState: { cookies: [], origins: [] } });
  // The deleted Member's page is a 404, which the browser logs.
  test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of 404/] });

  test("a Member downloads their data, then deletes their account: signed out, their thread still reads", async ({ page, browser }) => {
    test.setTimeout(180_000);
    const name = "Leaving Member";

    await signUpFresh(page, name);
    const text = `A note before leaving ${Date.now()}`;
    const written = await page.request.post("/api/swiftter/posts", { headers: BOTID_HUMAN, data: { content: `<p>${text}</p>` } });

    expect(written.status()).toBe(201);
    const { note } = (await written.json()) as { note: { id: string; author: { id: string } } };
    const memberPage = `/swiftter/m/${note.author.id}`;

    // Their Member page, while they are one.
    expect((await page.request.get(memberPage)).status()).toBe(200);

    // Someone else answers it (the shared test Member).
    const other = await browser.newContext({ storageState: existsSync(MEMBER_STATE) ? MEMBER_STATE : undefined });
    const answer = `Still here after they left ${Date.now()}`;

    expect((await other.request.post("/api/swiftter/posts", { headers: BOTID_HUMAN, data: { content: `<p>${answer}</p>`, parentId: note.id } })).status()).toBe(
      201,
    );
    await other.close();

    // The export: theirs, private, a download.
    const exported = await page.request.get("/api/swiftter/me/export");

    expect(exported.status()).toBe(200);
    expect(exported.headers()["cache-control"]).toBe("private, no-store");
    expect(exported.headers()["content-disposition"]).toMatch(/^attachment/);
    const data = (await exported.json()) as {
      account: { name: string };
      notes: { id: string; content: string }[];
      reshares: unknown[];
      moderationDecisions: { postId: string }[];
    };

    expect(data.account.name).toBe(name);
    expect(data.notes).toEqual([expect.objectContaining({ id: note.id, content: `<p>${text}</p>` })]);
    expect(data.moderationDecisions).toEqual([expect.objectContaining({ postId: note.id })]);
    expect(data.reshares).toEqual([]);

    // The header leads to their page.
    await page.getByRole("link", { name: "Your page" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Your guestbook page" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Download your data (JSON)" })).toHaveAttribute("href", "/api/swiftter/me/export");
    await expectNoAxeViolations(page);

    // Deleting asks first; keeping it changes nothing.
    await page.getByRole("button", { name: "Delete my account" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete your account?" });

    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Keep it" }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Delete my account" }).click();
    await dialog.getByRole("button", { name: "Delete it" }).click();

    // Signed out, on the home page.
    await expect(page).toHaveURL(/\/$/);
    expect(await (await page.request.get("/api/auth/get-session")).json()).toBeNull();
    expect((await page.request.get("/api/swiftter/me/export")).status()).toBe(401);
    await page.goto("/guestbook");
    await expect(page).toHaveURL(/\/sign-in/);

    // Their thread still reads, their note torn up, with no name on it.
    const thread = await page.goto(`/swiftter/p/${note.id}`);

    await expect(page.getByRole("heading", { level: 1, name: "A torn-up note" })).toBeVisible();
    await expect(page.getByText(answer)).toBeVisible();
    expect(await thread?.text()).not.toContain(name);

    // Their Member page is gone with their account.
    const gone = await page.goto(memberPage);

    expect(gone?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "This page isn't in the guestbook." })).toBeVisible();
    expect((await page.request.get(`/api/swiftter/members/${note.author.id}/posts`)).status()).toBe(404);
  });
});
