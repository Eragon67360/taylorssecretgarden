import type { Page } from "@playwright/test";

import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow, expectReducedMotion } from "./checks";
import { expect, test } from "./fixtures";
import { newTestMember, readTestMember, writeGuard } from "./member";

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

		test("passes axe (WCAG 2.1 AA)", async ({ page }) => {
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

test("a Google sign-in that went wrong comes back with an explanation", async ({ page }) => {
	await page.goto("/sign-in?error=access_denied");

	await expect(formError(page)).toContainText("Google");
	// It is not about the email or password, so those are not marked.
	await expect(page.getByRole("textbox", { name: "Email" })).not.toHaveAttribute("aria-invalid");
});

// BotID guards signing up and signing in (lib/bot-protection.ts). These
// requests are refused before they reach Neon Auth, and would be invalid there
// anyway (no email, no password), so they are safe on any database.
for (const path of ["/api/auth/sign-up/email", "/api/auth/sign-in/email"]) {
	test(`a request to ${path} without BotID's token is refused with 403`, async ({ request }) => {
		const response = await request.post(path, { data: {} });

		expect(response.status()).toBe(403);
	});
}

test.describe("BotID in the browser", () => {
	// The stubbed refusal below is logged by the browser as a failed request.
	test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of 401/] });

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
		await page.route(/^https:\/\/accounts\.google\.com\//, (route) =>
			route.fulfill({ status: 200, contentType: "text/html", body: "<title>Google</title>" }),
		);
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
