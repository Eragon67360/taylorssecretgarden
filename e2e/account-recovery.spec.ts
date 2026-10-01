import type { Page, Route } from "@playwright/test";

import { Pool } from "pg";

import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow } from "./checks";
import { expect, test } from "./fixtures";
import { BOTID_HUMAN, newTestMember, writeGuard } from "./member";

// A forgotten password (/forgot-password → the emailed link → /reset-password)
// and confirming an email address with a code (#118, #82). Neon Auth is
// stubbed wherever an email would have to be read; the last tests drive a
// real reset on a disposable branch, reading the link's token from Neon Auth's
// own table, as the email would carry it.

/** The form's error message (Next.js keeps an empty route announcer alert of its own). */
const formError = (page: Page) => page.locator("#main").getByRole("alert");
const formNotice = (page: Page) => page.locator("#main").getByRole("status");

const fulfil = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

test.describe("forgot your password", () => {
  test("sign-in leads there, still headed for the same place", async ({ page }) => {
    await page.goto(`/sign-in?redirect_url=${encodeURIComponent("/swiftter/p/some-thread")}`);
    await page.getByRole("link", { name: "Forgot your password?" }).click();

    await expect(page).toHaveURL(/\/forgot-password\?redirect_url=%2Fswiftter%2Fp%2Fsome-thread$/);
    await expect(page.getByRole("heading", { level: 2, name: "Forgot your password?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in?redirect_url=%2Fswiftter%2Fp%2Fsome-thread");
  });

  test("asks for an email before sending anything", async ({ page }) => {
    let sent = false;

    await page.route("**/api/auth/request-password-reset", (route) => {
      sent = true;

      return route.fallback();
    });
    await page.goto("/forgot-password");
    await page.getByRole("button", { name: "Send me a link" }).click();

    await expect(page.getByRole("textbox", { name: "Email" })).toBeFocused();
    await page.getByRole("textbox", { name: "Email" }).fill("not an address");
    await page.getByRole("button", { name: "Send me a link" }).click();
    expect(await page.getByRole("textbox", { name: "Email" }).evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false);
    expect(sent).toBe(false);
  });

  test("answers every address the same, sending BotID's token and the reset page's full address", async ({ page }) => {
    const requests: { token?: string; body: { email: string; redirectTo: string } }[] = [];

    // Neon Auth answers alike whether or not the account exists; so does the stub.
    await page.route("**/api/auth/request-password-reset", (route) => {
      requests.push({ token: route.request().headers()["x-is-human"], body: route.request().postDataJSON() });

      return fulfil(route, { status: true, message: "If this email exists in our system, check your email for the reset link" });
    });
    await page.goto(`/forgot-password?redirect_url=${encodeURIComponent("/music")}`);

    const answers: string[] = [];

    for (const email of ["someone@example.com", "nobody-at-all@example.com"]) {
      await page.getByRole("textbox", { name: "Email" }).fill(email);
      await page.getByRole("button", { name: "Send me a link" }).click();
      await expect(formNotice(page)).toContainText("If an account uses that address");
      answers.push((await formNotice(page).textContent()) ?? "");
      await page.getByRole("button", { name: "Try another one" }).click();
    }

    expect(answers[0]).toBe(answers[1]);
    expect(requests.map(({ body }) => body.email)).toEqual(["someone@example.com", "nobody-at-all@example.com"]);
    for (const { token, body } of requests) {
      expect(token, "x-is-human header").toBeTruthy();
      expect(body.redirectTo).toBe(new URL("/reset-password?redirect_url=%2Fmusic", page.url()).href);
    }
  });

  test.describe("when it cannot send", () => {
    test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of 4(03|29)/] });

    test("says so for a bot check or a rate limit, and nothing about the account", async ({ page }) => {
      let status = 403;

      await page.route("**/api/auth/request-password-reset", (route) =>
        fulfil(route, status === 403 ? { code: "BOT_DETECTED", message: "x" } : { message: "Too many requests" }, status),
      );
      await page.goto("/forgot-password");
      await page.getByRole("textbox", { name: "Email" }).fill("someone@example.com");
      await page.getByRole("button", { name: "Send me a link" }).click();
      await expect(formError(page)).toContainText("Reload the page");
      await expectNoAxeViolations(page);

      status = 429;
      await page.getByRole("button", { name: "Send me a link" }).click();
      await expect(formError(page)).toContainText("Too many tries");
      await expect(formNotice(page)).toHaveCount(0);
    });
  });

  test("passes axe, before and after sending", async ({ page }) => {
    await page.route("**/api/auth/request-password-reset", (route) => fulfil(route, { status: true }));
    await page.goto("/forgot-password");
    await expectNoAxeViolations(page);
    await page.getByRole("textbox", { name: "Email" }).fill("someone@example.com");
    await page.getByRole("button", { name: "Send me a link" }).click();
    await expect(formNotice(page)).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("fits a 390px phone", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/forgot-password");
    await expectNoHorizontalOverflow(page);
  });

  // BotID guards it: it sends email (lib/botid-routes.ts). Refused before Neon Auth, so safe anywhere.
  test("a request without BotID's token is refused with 403", async ({ request }) => {
    expect((await request.post("/api/auth/request-password-reset", { data: { email: "someone@example.com" } })).status()).toBe(403);
  });
});

test.describe("choosing a new password", () => {
  const newPassword = (page: Page) => page.getByLabel("New password", { exact: true });
  const again = (page: Page) => page.getByLabel("New password, again", { exact: true });

  for (const path of ["/reset-password", "/reset-password?error=INVALID_TOKEN", "/reset-password?token=abc&error=INVALID_TOKEN"]) {
    test(`${path} says the link has expired and offers a new one`, async ({ page }) => {
      await page.goto(path);

      await expect(page.getByRole("heading", { level: 2, name: "This link has expired" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Send me a new link" })).toHaveAttribute("href", "/forgot-password");
      await expect(newPassword(page)).toHaveCount(0);
    });
  }

  test("the expired page passes axe and fits a phone", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/reset-password?error=INVALID_TOKEN&redirect_url=%2Fmusic");
    await expect(page.getByRole("link", { name: "Send me a new link" })).toHaveAttribute("href", "/forgot-password?redirect_url=%2Fmusic");
    await expectNoAxeViolations(page);
    await expectNoHorizontalOverflow(page);
  });

  test("keeps the token from other sites: no Referer", async ({ page }) => {
    await page.goto("/reset-password?token=abc");
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  });

  test("checks the two passwords and the sign-up rule before sending anything", async ({ page }) => {
    let sent = false;

    await page.route("**/api/auth/reset-password", (route) => {
      sent = true;

      return route.fallback();
    });
    await page.goto("/reset-password?token=abc");
    await expectNoAxeViolations(page);

    await newPassword(page).fill("short");
    await again(page).fill("short");
    await page.getByRole("button", { name: "Save my new password" }).click();
    expect(await newPassword(page).evaluate((input: HTMLInputElement) => input.validity.tooShort)).toBe(true);

    await newPassword(page).fill("long enough, surely");
    await again(page).fill("long enough, surely?");
    await page.getByRole("button", { name: "Save my new password" }).click();
    expect(await again(page).evaluate((input: HTMLInputElement) => input.validationMessage)).toBe("The two passwords don't match.");
    expect(sent).toBe(false);
  });

  test("sets it with the link's token, then asks to sign in with it", async ({ page }) => {
    let body: unknown;

    await page.route("**/api/auth/reset-password", (route) => {
      body = route.request().postDataJSON();

      return fulfil(route, { status: true });
    });
    await page.goto("/reset-password?token=the-token&redirect_url=%2Fmusic");
    await newPassword(page).fill("a new long password");
    await again(page).fill("a new long password");
    await page.getByRole("button", { name: "Save my new password" }).click();

    await expect(page).toHaveURL(/\/sign-in\?notice=password-reset&redirect_url=%2Fmusic$/);
    await expect(formNotice(page)).toHaveText("Your password is changed. Sign in with the new one.");
    expect(body).toEqual({ newPassword: "a new long password", token: "the-token" });
    await expectNoAxeViolations(page);
  });

  test.describe("with a token Neon Auth refuses", () => {
    test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of 400/] });

    test("explains the link has expired", async ({ page }) => {
      await page.route("**/api/auth/reset-password", (route) => fulfil(route, { code: "INVALID_TOKEN", message: "Invalid token" }, 400));
      await page.goto("/reset-password?token=used");
      await newPassword(page).fill("a new long password");
      await again(page).fill("a new long password");
      await page.getByRole("button", { name: "Save my new password" }).click();

      await expect(page.getByRole("heading", { level: 2, name: "This link has expired" })).toBeVisible();
    });
  });

  test("fits a 390px phone", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/reset-password?token=abc");
    await expectNoHorizontalOverflow(page);
  });

  test("an unknown notice is never shown", async ({ page }) => {
    await page.goto("/sign-in?notice=%3Cb%3Ehello%3C%2Fb%3E");
    await expect(formNotice(page)).toHaveCount(0);
  });
});

test.describe("confirming an email address", () => {
  const code = (page: Page) => page.getByRole("textbox", { name: "Code" });

  test("a sign-up Neon Auth holds until the address is confirmed asks for the code, then carries on", async ({ page }) => {
    const user = { id: "u", name: "Code Swiftie", email: "code@example.com", emailVerified: false };
    let verified: unknown;

    await page.route("**/api/auth/sign-up/email", (route) => fulfil(route, { token: null, user }));
    await page.route("**/api/auth/email-otp/verify-email", (route) => {
      verified = route.request().postDataJSON();

      return fulfil(route, { status: true, token: "t", user: { ...user, emailVerified: true } });
    });
    await page.goto("/sign-up?redirect_url=%2Fmusic");
    await page.getByRole("textbox", { name: "Name" }).fill(user.name);
    await page.getByRole("textbox", { name: "Email" }).fill(user.email);
    await page.getByLabel("Password").fill("long enough password");
    await page.getByRole("button", { name: "Sign the guestbook" }).click();

    await expect(page.getByRole("heading", { level: 2, name: "Check your email" })).toBeVisible();
    await expect(formNotice(page)).toHaveText("We've sent a code to code@example.com.");
    await expect(page.getByRole("button", { name: /Send a new code \(in \d+s\)/ })).toBeDisabled();
    await expectNoAxeViolations(page);

    await code(page).fill("123 456");
    await page.getByRole("button", { name: "Confirm my email" }).click();
    await expect(page).toHaveURL(/\/music$/);
    expect(verified).toEqual({ email: user.email, otp: "123456" });
  });

  test.describe("refusals", () => {
    test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of 40[03]/] });

    test("a sign-in refused for an unconfirmed address asks for the code, and a wrong one says so", async ({ page }) => {
      let sendToken: string | undefined;

      await page.route("**/api/auth/sign-in/email", (route) => fulfil(route, { code: "EMAIL_NOT_VERIFIED", message: "Email not verified" }, 403));
      await page.route("**/api/auth/email-otp/verify-email", (route) => fulfil(route, { code: "INVALID_OTP", message: "Invalid OTP" }, 400));
      await page.route("**/api/auth/send-verification-email", (route) => {
        sendToken = route.request().headers()["x-is-human"];

        return fulfil(route, { status: true });
      });
      await page.goto("/sign-in");
      await page.getByRole("textbox", { name: "Email" }).fill("late@example.com");
      await page.getByLabel("Password", { exact: true }).fill("long enough password");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();

      await expect(page.getByRole("heading", { level: 2, name: "Check your email" })).toBeVisible();
      await code(page).fill("000000");
      await page.getByRole("button", { name: "Confirm my email" }).click();
      await expect(formError(page)).toContainText("doesn't match");
      await expect(code(page)).toHaveAttribute("aria-invalid", "true");
      await expectNoAxeViolations(page);

      // A new code, at once (nothing was sent from this page yet), with BotID's token.
      await page.getByRole("button", { name: "Send a new code" }).click();
      await expect(formNotice(page)).toContainText("We've sent a code to late@example.com");
      expect(sendToken, "x-is-human header").toBeTruthy();
    });
  });

  test("fits a 390px phone", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.route("**/api/auth/sign-up/email", (route) => fulfil(route, { token: null, user: { id: "u", name: "N", email: "n@example.com" } }));
    await page.goto("/sign-up");
    await page.getByRole("textbox", { name: "Name" }).fill("N");
    await page.getByRole("textbox", { name: "Email" }).fill("a-rather-long-address-for-a-phone@example.com");
    await page.getByLabel("Password").fill("long enough password");
    await page.getByRole("button", { name: "Sign the guestbook" }).click();
    await expect(code(page)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("a request for a code without BotID's token is refused with 403", async ({ request }) => {
    expect((await request.post("/api/auth/send-verification-email", { data: { email: "someone@example.com" } })).status()).toBe(403);
  });

  // Only the code endpoints the site uses are forwarded: not the link, nor the sign-in-by-code family.
  for (const [method, path] of [
    ["GET", "/api/auth/verify-email?token=x"],
    ["POST", "/api/auth/email-otp/send-verification-otp"],
    ["POST", "/api/auth/sign-in/email-otp"],
    ["GET", "/api/auth/reset-password/some-token?callbackURL=%2F"],
  ] as const) {
    test(`${method} ${path} is not forwarded to Neon Auth (404)`, async ({ request }) => {
      expect((await request.fetch(path, { method, headers: BOTID_HUMAN, data: method === "POST" ? {} : undefined })).status()).toBe(404);
    });
  }
});

// Everything below talks to Neon Auth and reads its tables, so only on a disposable or development branch.
test.describe("a real reset, end to end", () => {
  test.skip(!!writeGuard(), writeGuard() ?? "");
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a Member asks for a link, follows it through Neon Auth, chooses a new password and signs in with it", async ({ page, request }) => {
    test.setTimeout(120_000);
    const member = newTestMember();
    const signedUp = await request.post("/api/auth/sign-up/email", { headers: BOTID_HUMAN, data: { ...member, name: "Forgetful Swiftie" } });

    expect(signedUp.status()).toBe(200);
    const { user } = (await signedUp.json()) as { user: { id: string } };

    await page.goto("/sign-in?redirect_url=%2Fmusic");
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    // Sign-in has an Email field too: wait for the new page before typing.
    await expect(page.getByRole("heading", { level: 2, name: "Forgot your password?" })).toBeVisible();
    await page.getByRole("textbox", { name: "Email" }).fill(member.email);
    await page.getByRole("button", { name: "Send me a link" }).click();
    await expect(formNotice(page)).toContainText("If an account uses that address");

    // What the email carries: Neon Auth's own address, with the token and where to send the browser.
    // Read only, as the branch's owner (DATABASE_URL in CI and on `dev`, as for tests/integration/auth-account.test.ts).
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let token: string | undefined;

    try {
      const { rows } = await pool.query<{ identifier: string }>(
        `select identifier from neon_auth.verification where value = $1 and identifier like 'reset-password:%' order by "createdAt" desc limit 1`,
        [user.id],
      );

      token = rows[0]?.identifier.slice("reset-password:".length);
    } finally {
      await pool.end();
    }
    expect(token, "the reset token Neon Auth stored").toBeTruthy();
    const callbackURL = new URL("/reset-password?redirect_url=%2Fmusic", page.url()).href;

    await page.goto(`${process.env.NEON_AUTH_BASE_URL}/reset-password/${token}?callbackURL=${encodeURIComponent(callbackURL)}`);
    await expect(page).toHaveURL(new RegExp(`/reset-password\\?redirect_url=%2Fmusic&token=${token}$`));

    const password = `${member.password}-new`;

    await page.getByLabel("New password", { exact: true }).fill(password);
    await page.getByLabel("New password, again", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Save my new password" }).click();
    await expect(formNotice(page)).toHaveText("Your password is changed. Sign in with the new one.");

    await page.getByRole("textbox", { name: "Email" }).fill(member.email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/music$/);
    await expect(page.getByRole("banner").getByRole("button", { name: "Sign out" })).toBeVisible();

    // The link works once.
    await page.goto(`${process.env.NEON_AUTH_BASE_URL}/reset-password/${token}?callbackURL=${encodeURIComponent(callbackURL)}`);
    await expect(page.getByRole("heading", { level: 2, name: "This link has expired" })).toBeVisible();
  });

  test("an unconfirmed Member is asked to confirm their address on their guestbook page", async ({ page }) => {
    const member = newTestMember();
    const signedUp = await page.request.post("/api/auth/sign-up/email", { headers: BOTID_HUMAN, data: { ...member, name: "Unconfirmed Swiftie" } });

    expect(signedUp.status()).toBe(200);
    // Sending the email is Neon Auth's business: stubbed, so no test sends one.
    await page.route("**/api/auth/send-verification-email", (route) => fulfil(route, { status: true }));
    await page.goto("/guestbook");

    const section = page.getByRole("region", { name: "Confirm your email address" });

    await expect(section).toContainText(member.email);
    await section.getByRole("button", { name: "Send me a code" }).click();
    await expect(section.getByRole("textbox", { name: "Code" })).toBeFocused();
    await expectNoAxeViolations(page);
  });

  test.describe("refused tokens", () => {
    test("Neon Auth refuses a made-up token, through the proxy (400 INVALID_TOKEN)", async ({ request }) => {
      const response = await request.post("/api/auth/reset-password", { data: { newPassword: "a new long password", token: "made-up" } });

      expect(response.status()).toBe(400);
      expect(((await response.json()) as { code?: string }).code).toBe("INVALID_TOKEN");
    });
  });
});
