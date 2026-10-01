import type { Page } from "@playwright/test";

import { existsSync } from "node:fs";

import { seedId } from "../scripts/seed-data";

import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow, expectReducedMotion } from "./checks";
import { expect, test } from "./fixtures";
import { MEMBER_STATE, newTestMember, readTestMember, writeGuard } from "./member";

// Sign-in and sign-up are "signing the guestbook": our own forms on a paper
// card, in the journal's hand, backed by Neon Auth through /api/auth.
const pages = [
  { path: "/sign-in", title: "Sign in to Taylor's Secret Garden", submit: "Sign in", fields: ["Email", "Password"] },
  { path: "/sign-up", title: "Become a Member", submit: "Sign the guestbook", fields: ["Name", "Email", "Password"] },
];

const field = (page: Page, name: string) =>
  name === "Password" ? page.getByLabel("Password", { exact: true }) : page.getByRole("textbox", { name, exact: true });

/** The form's error message (Next.js keeps an empty route announcer alert of its own). */
const formError = (page: Page) => page.locator("#main").getByRole("alert");

for (const { path, title, submit, fields } of pages) {
  test.describe(`guestbook ${path}`, () => {
    test("shows the guestbook heading and our own form", async ({ page }) => {
      await page.goto(path);

      await expect(page.getByRole("heading", { level: 1, name: "Sign the guestbook" })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
      for (const name of fields) await expect(field(page, name)).toBeVisible();
      await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
      await expect(page.getByRole("button", { name: submit, exact: true })).toBeVisible();
      // No vendor badge: nothing on the page says who runs sign-in.
      await expect(page.getByText(/secured by|clerk|neon/i)).toHaveCount(0);
    });

    test("can be worked through with the keyboard alone", async ({ page }) => {
      await page.goto(path);

      // Google first, then each field in order, then the submit button.
      await page.getByRole("button", { name: "Continue with Google" }).focus();
      for (const name of fields) {
        await page.keyboard.press("Tab");
        await expect(field(page, name)).toBeFocused();
      }
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: submit, exact: true })).toBeFocused();
    });

    test("asks for what is missing before sending anything", async ({ page }) => {
      let sent = false;

      await page.route(/\/api\/auth\/sign-(in|up)\//, (route) => {
        sent = true;

        return route.fallback();
      });
      await page.goto(path);
      await page.getByRole("button", { name: submit, exact: true }).click();

      await expect(field(page, fields[0])).toBeFocused();
      expect(await field(page, fields[0]).evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
      expect(sent).toBe(false);
    });

    test("is journal paper, not the old gradient", async ({ page }) => {
      await page.goto(path);

      const gradients = await page.locator("#main").evaluate((main) =>
        [main, ...main.querySelectorAll("*")]
          // Page-sized backdrops only: small craft pieces (washi tape) use gradients for sheen.
          .filter((element) => {
            const { width, height } = element.getBoundingClientRect();

            return width >= innerWidth / 2 && height >= innerHeight / 2;
          })
          .map((element) => getComputedStyle(element).backgroundImage)
          .filter((image) => image.includes("gradient")),
      );

      expect(gradients, "gradient backgrounds on the page").toEqual([]);
    });

    test("passes axe (WCAG 2.2 AA)", async ({ page }) => {
      await page.goto(path);
      await expectNoAxeViolations(page);
    });

    test("passes axe while showing an error", async ({ page }) => {
      await page.goto(`${path}?error=access_denied`);
      await expect(formError(page)).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test("fits a 390px phone", async ({ page }) => {
      await page.setViewportSize(PHONE);
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
    });

    test("is still under reduced motion", async ({ page }) => {
      await page.goto(path);
      await expectReducedMotion(page);
    });
  });
}

test("sign-in and sign-up link to each other", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/sign-up$/);
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("sign-in and sign-up keep where the visitor was headed, both ways", async ({ page }) => {
  const thread = `/sign-in?redirect_url=${encodeURIComponent("/swiftter/p/some-thread")}`;

  await page.goto(thread);
  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/sign-up\?redirect_url=%2Fswiftter%2Fp%2Fsome-thread$/);
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Fswiftter%2Fp%2Fsome-thread$/);
  // Another site is never carried along.
  await page.goto(`/sign-in?redirect_url=${encodeURIComponent("//evil.example")}`);
  await expect(page.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/sign-up");
});

test("a Google sign-in that went wrong comes back with an explanation", async ({ page }) => {
  await page.goto("/sign-in?error=access_denied");

  await expect(formError(page)).toContainText("Google");
  // It is not about the email or password, so those are not marked.
  await expect(page.getByRole("textbox", { name: "Email" })).not.toHaveAttribute("aria-invalid");
});

// BotID guards signing up and signing in (lib/bot-protection.ts). These
// requests are refused before they reach Neon Auth, and would be invalid there
// anyway (no email, no password), so they are safe on any database.
// (The encoded spelling reaches the same Neon Auth endpoint, so it is guarded too.)
for (const path of ["/api/auth/sign-up/email", "/api/auth/sign-in/email", "/api/auth/sign%2Dup/email"]) {
  test(`a request to ${path} without BotID's token is refused with 403`, async ({ request }) => {
    const response = await request.post(path, { data: {} });

    expect(response.status()).toBe(403);
  });
}

// Only the endpoints the site uses are forwarded to Neon Auth (lib/auth/proxy-routes.ts):
// dot segments or encoded slashes that Neon Auth's own URL handling would resolve,
// and the parts of its API the site never calls, stop here with 404.
for (const path of [
  "/api/auth/.%2Fsign-up/email",
  "/api/auth/x%2F..%2Fsign-up/email",
  "/api/auth/.%2Fsign-in/email",
  "/api/auth/x%5C..%5Csign-in/email",
  "/api/auth/update-user",
  "/api/auth/admin/create-user",
]) {
  test(`${path} is not forwarded to Neon Auth (404)`, async ({ request }) => {
    expect((await request.post(path, { data: {} })).status()).toBe(404);
  });
}

test.describe("BotID in the browser", () => {
  // The stubbed refusals below are logged by the browser as failed requests.
  test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of 4(01|22)/] });

  test("the sign-in form sends BotID's token with the request", async ({ page }) => {
    let token: string | undefined;

    // Neon Auth itself is not part of the test: the request is caught here.
    await page.route("**/api/auth/sign-in/email", (route) => {
      token = route.request().headers()["x-is-human"];

      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "INVALID_EMAIL_OR_PASSWORD" }) });
    });
    await page.goto("/sign-in");
    await field(page, "Email").fill("nobody@example.com");
    await field(page, "Password").fill("not-a-real-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(formError(page)).toBeVisible();
    expect(token, "x-is-human header").toBeTruthy();
  });

  test("the sign-up form sends BotID's token with the request, and shows Neon Auth's refusal", async ({ page }) => {
    let token: string | undefined;

    await page.route("**/api/auth/sign-up/email", (route) => {
      token = route.request().headers()["x-is-human"];

      return route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", message: "User already exists. Use another email." }),
      });
    });
    await page.goto("/sign-up");
    await field(page, "Name").fill("Nobody");
    await field(page, "Email").fill("nobody@example.com");
    await field(page, "Password").fill("not-a-real-password");
    await page.getByRole("button", { name: "Sign the guestbook", exact: true }).click();

    await expect(formError(page)).toContainText(/already signed the guestbook/i);
    expect(token, "x-is-human header").toBeTruthy();
  });
});

/** Counts the page's session requests to /api/auth/get-session. */
function countSessionRequests(page: Page) {
  const seen: string[] = [];

  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/auth/get-session") seen.push(request.url());
  });

  return seen;
}

/** Once the page has loaded and gone idle, when the header asks who is signed in (components/site-header.tsx). */
async function settle(page: Page) {
  await page.waitForLoadState("load");
  await page.evaluate(() => new Promise<void>((resolve) => requestIdleCallback(() => resolve())));
  await page.waitForLoadState("networkidle");
}

// The header and Swiftter both want to know who is signed in: they share one request (lib/auth/member-hint.ts).
test("a visitor's Swiftter page asks who is signed in once", async ({ page }) => {
  const sessions = countSessionRequests(page);

  await page.goto("/swiftter");
  await expect(page.getByRole("link", { name: /sign the guestbook to pass a note/i }).first()).toBeVisible();
  await settle(page);

  expect(sessions).toHaveLength(1);
});

test("a Google sign-in coming back is completed by the page's one session request", async ({ page }) => {
  const sessions = countSessionRequests(page);

  // Neon Auth itself is not part of the test: the exchange is stubbed, answering with a Member.
  await page.route("**/api/auth/get-session?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ session: { id: "s" }, user: { id: "u", name: "Google Swiftie", email: "google@example.com" } }),
    }),
  );
  // The member menu's new-replies badge asks too; with no real session behind the stub, it is answered here.
  await page.route("**/api/swiftter/me/replies*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ count: 0, at: new Date().toISOString(), moderator: false }) }),
  );
  await page.goto("/music?neon_auth_session_verifier=the-verifier");

  await expect(page.getByRole("banner").getByRole("button", { name: "Sign out" })).toBeVisible();
  await settle(page);
  expect(sessions).toEqual([expect.stringMatching(/\/api\/auth\/get-session\?neon_auth_session_verifier=the-verifier$/)]);
  // Done with, the verifier leaves the address bar.
  await expect(page).toHaveURL(/\/music$/);
});

// Everything below talks to Neon Auth, so it only runs on a disposable branch.
test.describe("signing in and out", () => {
  test.skip(!!writeGuard(), writeGuard() ?? "");
  // The browser logs Neon Auth's refusals (a used email, a wrong password) as failed requests.
  test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of 4(01|22)/] });

  test("a new visitor signs up and is taken to Swiftter", async ({ page }) => {
    const member = newTestMember();

    await page.goto("/sign-up");
    await field(page, "Name").fill("Fresh Swiftie");
    await field(page, "Email").fill(member.email);
    await field(page, "Password").fill(member.password);
    await field(page, "Password").press("Enter");

    await expect(page).toHaveURL(/\/swiftter$/);
    await expect(page.getByText("writing as Fresh Swiftie")).toBeVisible();
  });

  test("a visitor who signs up from a thread's reply link goes back to the thread", async ({ page }) => {
    const member = newTestMember();
    const thread = `/swiftter/p/${seedId("p", 1)}`;

    await page.goto(thread);
    await page.getByRole("link", { name: /sign the guestbook to reply/i }).click();
    await page.getByRole("link", { name: "Sign up" }).click();
    await field(page, "Name").fill("Thread Swiftie");
    await field(page, "Email").fill(member.email);
    await field(page, "Password").fill(member.password);
    await page.getByRole("button", { name: "Sign the guestbook" }).click();

    await expect(page).toHaveURL(new RegExp(`${thread}$`));
    await expect(page.getByRole("button", { name: /^reply to/i }).first()).toBeVisible();
  });

  test("a Member's Swiftter page asks who is signed in once", async ({ browser }) => {
    test.skip(!existsSync(MEMBER_STATE), "The setup project signs up the test Member");

    const context = await browser.newContext({ storageState: MEMBER_STATE });
    const page = await context.newPage();
    const sessions = countSessionRequests(page);

    await page.goto("/swiftter");
    await expect(page.getByText(/^writing as /)).toBeVisible();
    await expect(page.getByRole("banner").getByRole("button", { name: "Sign out" })).toBeVisible();
    await settle(page);
    expect(sessions).toHaveLength(1);
    await context.close();
  });

  test("signing up again with a used email says so", async ({ page }) => {
    const member = readTestMember();

    test.skip(!member, "The setup project signs up the test Member");

    await page.goto("/sign-up");
    await field(page, "Name").fill("Copycat");
    await field(page, "Email").fill(member!.email);
    await field(page, "Password").fill(member!.password);
    await page.getByRole("button", { name: "Sign the guestbook" }).click();

    await expect(formError(page)).toContainText(/already/i);
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test("a Member signs in with email and password and goes back where they were", async ({ page }) => {
    const member = readTestMember();

    test.skip(!member, "The setup project signs up the test Member");

    await page.goto("/sign-in?redirect_url=%2Fswiftter");
    await field(page, "Email").fill(member!.email);
    await field(page, "Password").fill(member!.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page).toHaveURL(/\/swiftter$/);
    await expect(page.getByText(`writing as ${member!.name}`)).toBeVisible();
  });

  test("a wrong password is refused with a clear message", async ({ page }) => {
    const member = readTestMember();

    test.skip(!member, "The setup project signs up the test Member");

    await page.goto("/sign-in");
    await field(page, "Email").fill(member!.email);
    await field(page, "Password").fill(`${member!.password}-wrong`);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(formError(page)).toHaveText(/email or password/i);
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(field(page, "Password")).toHaveValue("");
    await expect(field(page, "Password")).toHaveAttribute("aria-invalid", "true");
    await expect(field(page, "Password")).toBeFocused();
  });

  test("Continue with Google hands the visitor to Google", async ({ page }) => {
    // Google itself is not part of the test: its page is stubbed.
    await page.route(/^https:\/\/accounts\.google\.com\//, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>Google</title>" }));
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Continue with Google" }).click();

    await expect(page).toHaveURL(/^https:\/\/accounts\.google\.com\//);
  });

  test("a Member signs out from the header, on any page", async ({ page }) => {
    const member = readTestMember();

    test.skip(!member, "The setup project signs up the test Member");

    // Its own session, so the one the other tests share stays signed in.
    await page.goto("/sign-in?redirect_url=%2Fmusic");
    await field(page, "Email").fill(member!.email);
    await field(page, "Password").fill(member!.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/music$/);

    const signOut = page.getByRole("banner").getByRole("button", { name: "Sign out" });

    await signOut.click();
    await expect(signOut).toHaveCount(0);

    await page.goto("/swiftter");
    await expect(page.getByRole("link", { name: /sign the guestbook to pass a note/i })).toBeVisible();
  });
});
