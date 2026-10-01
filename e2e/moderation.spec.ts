import type { Page } from "@playwright/test";

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow } from "./checks";
import { expect, test } from "./fixtures";
import { BOTID_HUMAN, MEMBER_DIR, MEMBER_STATE, newTestMember, readTestMember, writeGuard } from "./member";

// The moderators' page (/guestbook/moderation, #166) and its routes. The
// moderator is a fresh Member granted the role by `npm run moderator`, on the
// disposable branch only (the write guard), and revoked afterwards.
const PAGE = "/guestbook/moderation";
const LIST = "/api/swiftter/moderation";
const FEED = "/api/swiftter/posts";
/** A note that does not exist: the role is checked before the note is looked up. */
const SOME_NOTE = "00000000-0000-4000-8000-000000000000";

test.describe("moderation, for anyone but a moderator", () => {
  // The page is a 404, which the browser logs.
  test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of 404/] });

  test("a visitor gets the 404 page, and 401 from the routes", async ({ browser }) => {
    const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await visitor.newPage();

    expect((await page.goto(PAGE))?.status()).toBe(404);
    const list = await page.request.get(LIST);

    expect(list.status()).toBe(401);
    expect(list.headers()["cache-control"]).toBe("private, no-store");
    expect((await page.request.post(`${LIST}/${SOME_NOTE}`, { headers: BOTID_HUMAN, data: { action: "keep" } })).status()).toBe(401);
    await visitor.close();
  });

  test("a Member who is not a moderator gets the 404 page, 403 from the routes, and no link in their menu", async ({ browser }) => {
    test.skip(!!writeGuard() || !readTestMember(), "Needs the test Member (e2e/member.setup.ts)");
    const member = await browser.newContext({ storageState: MEMBER_STATE });
    const page = await member.newPage();

    expect((await page.goto(PAGE))?.status()).toBe(404);
    const list = await page.request.get(LIST);

    expect(list.status()).toBe(403);
    expect(list.headers()["cache-control"]).toBe("private, no-store");
    for (const action of ["tear-up", "keep", "publish"]) {
      expect((await page.request.post(`${LIST}/${SOME_NOTE}`, { headers: BOTID_HUMAN, data: { action } })).status()).toBe(403);
    }

    await page.goto("/guestbook");
    await expect(page.getByRole("link", { name: "Your page" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Moderation" })).toHaveCount(0);
    await member.close();
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

/** Grants or revokes the role with the owner's script, as the README says, on this run's branch. */
const moderatorScript = (action: "grant" | "revoke", memberId: string) =>
  execFileSync("npx", ["tsx", "scripts/moderator.ts", action, memberId], { env: process.env, encoding: "utf8" });

test.describe("moderation, for a moderator", () => {
  test.skip(!!writeGuard(), writeGuard() ?? "");
  const authorState = path.join(MEMBER_DIR, "moderated-author-state.json");
  const moderatorState = path.join(MEMBER_DIR, "moderator-state.json");
  let moderatorId = "";

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);

    for (const [file, name] of [
      [authorState, "Moderated Author"],
      [moderatorState, "Kind Moderator"],
    ]) {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });

      await signUpFresh(await context.newPage(), name);
      await context.storageState({ path: file });
      if (file === moderatorState) moderatorId = ((await (await context.request.get("/api/auth/get-session")).json()) as { user: { id: string } }).user.id;
      await context.close();
    }
    expect(moderatorScript("grant", moderatorId)).toContain("Granted");
  });

  test.afterAll(() => {
    if (moderatorId) moderatorScript("revoke", moderatorId);
  });

  test.use({ storageState: async ({}, provide) => provide(existsSync(moderatorState) ? moderatorState : undefined), viewport: PHONE });

  test("on a phone, a moderator tears up a reported note and publishes an appealed one, two taps each; the feed follows", async ({ page, browser }) => {
    const stamp = Date.now();
    const reported = `A note someone reported ${stamp}`;
    const appealed = `fake-insult but misjudged ${stamp}`;

    // The author writes both, one refused, and asks a human to look again at it.
    const author = await browser.newContext({ storageState: authorState });
    const written = await author.request.post(FEED, { headers: BOTID_HUMAN, data: { content: `<p>${reported}</p>` } });
    const refused = await author.request.post(FEED, { headers: BOTID_HUMAN, data: { content: `<p>${appealed}</p>` } });

    expect([written.status(), refused.status()]).toEqual([201, 422]);
    const publicId = ((await written.json()) as { note: { id: string } }).note.id;
    const refusedId = ((await refused.json()) as { note: { id: string } }).note.id;

    expect((await author.request.post(`${FEED}/${refusedId}/appeal`, { headers: BOTID_HUMAN })).status()).toBe(201);
    await author.close();
    // The moderator, a Member like any other, reports the first.
    expect((await page.request.post(`${FEED}/${publicId}/report`, { headers: BOTID_HUMAN, data: { reason: "It names someone's school." } })).status()).toBe(
      201,
    );

    // The menu leads there.
    await page.goto("/swiftter");
    await page.getByRole("link", { name: "Moderation" }).click();
    await expect(page).toHaveURL(new RegExp(`${PAGE}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Moderation" })).toBeVisible();
    const list = await page.request.get(LIST);

    expect(list.headers()["cache-control"]).toBe("private, no-store");
    expect(((await list.json()) as { items: { id: string }[] }).items.map((item) => item.id)).toEqual(expect.arrayContaining([publicId, refusedId]));

    const reportedCard = page.getByRole("article").filter({ hasText: reported });
    const appealedCard = page.getByRole("article").filter({ hasText: appealed });

    await expect(reportedCard).toContainText("Public");
    await expect(reportedCard).toContainText("1 report on a note by Moderated Author");
    await expect(reportedCard).toContainText("“It names someone's school.”");
    await expect(reportedCard).toContainText("Passed.");
    await expect(reportedCard.getByRole("link", { name: "its thread" })).toHaveAttribute("href", `/swiftter/p/${publicId}`);
    // A refused note's text is there for moderators, with the model's reason.
    await expect(appealedCard).toContainText("Refused");
    await expect(appealedCard).toContainText("Its author asked a human to look again.");
    await expect(appealedCard).toContainText("Refused: unkind.");
    await expectNoAxeViolations(page);
    await expectNoHorizontalOverflow(page);

    // Tear up: the action, then its confirmation, where the safe choice has the keyboard.
    await reportedCard.getByRole("button", { name: /^Tear up/ }).click();
    const tearUp = page.getByRole("dialog", { name: /Tear up this note\?/ });

    await expect(tearUp).toContainText(reported);
    await expect(tearUp.getByRole("button", { name: "Cancel" })).toBeFocused();
    await tearUp.getByRole("textbox", { name: /A note for the record/ }).fill("Personal details.");
    await expectNoAxeViolations(page);
    const decided = page.waitForResponse((response) => response.url().endsWith(`${LIST}/${publicId}`));

    await tearUp.getByRole("button", { name: "Tear it up" }).click();
    expect((await decided).status()).toBe(204);
    await expect(tearUp).toBeHidden();
    await expect(page.getByRole("status")).toHaveText("Torn up: it has left Swiftter.");
    await expect(reportedCard).toHaveCount(0);
    // The keyboard is not lost: it is on the next note, or the list's heading.
    await expect(page.locator("article:focus, h2:focus")).toHaveCount(1);

    // Publish after all: two taps again.
    await appealedCard.getByRole("button", { name: /^Publish after all/ }).click();
    const publish = page.getByRole("dialog", { name: /Publish this note after all\?/ });

    await publish.getByRole("button", { name: "Publish it" }).click();
    await expect(publish).toBeHidden();
    await expect(page.getByRole("status")).toHaveText("Published: it is on the feed now.");
    await expect(appealedCard).toHaveCount(0);

    // Deciding again is too late, and says so.
    expect((await page.request.post(`${LIST}/${publicId}`, { headers: BOTID_HUMAN, data: { action: "keep" } })).status()).toBe(409);

    // The feed's first page (cached, refreshed by each decision) has the published note, not the torn-up one.
    await page.goto("/swiftter");
    const feed = page.getByRole("feed", { name: "Notes" });

    await expect(feed.getByRole("article").filter({ hasText: appealed })).toBeVisible();
    await expect(feed.getByText(reported)).toHaveCount(0);
    await page.goto(`/swiftter/p/${publicId}`);
    await expect(page.getByText(reported)).toHaveCount(0);
  });
});
