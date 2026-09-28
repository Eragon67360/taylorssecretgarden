import type { Page } from "@playwright/test";

import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow, expectReducedMotion } from "./checks";
import { expect, test } from "./fixtures";

// Sign-in and sign-up are "signing the guestbook": Clerk's forms on a paper
// card, themed with the journal tokens, under a handwritten heading.
const pages = [
	{ path: "/sign-in", clerkTitle: "Sign in to Taylor's Secret Garden" },
	{ path: "/sign-up", clerkTitle: "Create your account" },
];

/** Clerk mounts its form after load; its Continue button means it is there. */
async function formMounted(page: Page) {
	await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible();
}

for (const { path, clerkTitle } of pages) {
	test.describe(`guestbook ${path}`, () => {
		test("shows the guestbook heading and Clerk's form", async ({ page }) => {
			await page.goto(path);

			await expect(page.getByRole("heading", { level: 1, name: "Sign the guestbook" })).toBeVisible();
			await expect(page.getByRole("heading", { name: clerkTitle, exact: true })).toBeVisible();
			await expect(page.getByRole("textbox").first()).toBeVisible();
			await formMounted(page);
		});

		test("is journal paper, not the old gradient", async ({ page }) => {
			await page.goto(path);
			await formMounted(page);

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
			await formMounted(page);
			await expectNoAxeViolations(page);
		});

		test("fits a 390px phone", async ({ page }) => {
			await page.setViewportSize(PHONE);
			await page.goto(path);
			await formMounted(page);
			await expectNoHorizontalOverflow(page);
		});

		test("is still under reduced motion", async ({ page }) => {
			await page.goto(path);
			await expectReducedMotion(page, undefined, formMounted);
		});
	});
}
