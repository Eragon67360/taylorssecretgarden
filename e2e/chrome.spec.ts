import tours from "../public/json/tours.json";

import { CHROME, PHONE, expectNoAxeViolations, expectNoHorizontalOverflow, expectReducedMotion } from "./checks";
import { expect, test } from "./fixtures";

// The site chrome (journal-tab header and footer) on every route. Routes not
// yet redesigned are checked on the chrome only; each page ticket widens the
// checks to its whole route.
const routes = ["/", "/music", "/tours", ...tours.map(({ slug }) => `/tours/${slug}`), "/swiftter", "/sign-in", "/sign-up"];

for (const path of routes) {
	test.describe(`chrome on ${path}`, () => {
		test("passes axe (WCAG 2.2 AA)", async ({ page }) => {
			await page.goto(path);
			await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
			await expectNoAxeViolations(page, CHROME);
		});

		test("fits a 390px phone", async ({ page }) => {
			await page.setViewportSize(PHONE);
			await page.goto(path);
			await expectNoHorizontalOverflow(page, CHROME);
		});

		test("is still under reduced motion", async ({ page }) => {
			await page.goto(path);
			await expectReducedMotion(page, CHROME);
		});
	});
}

test.describe("footer", () => {
	test("credits Deezer and says the site is an unofficial fan site", async ({ page }) => {
		await page.goto("/");
		const footer = page.getByRole("contentinfo");

		const deezer = footer.getByRole("link", { name: "Deezer" });

		await expect(deezer).toHaveAttribute("href", /^https:\/\/www\.deezer\.com/);
		// Deezer's API guidelines: its logo, clearly visible; its terms: previews for private listening.
		await expect(deezer.locator("svg")).toBeVisible();
		await expect(footer).toContainText(/for private listening only/i);
		await expect(footer).toContainText(/unofficial fan site/i);
	});

	test("links the Credits page", async ({ page }) => {
		await page.goto("/");
		await page.getByRole("contentinfo").getByRole("link", { name: "Credits", exact: true }).click();
		await expect(page).toHaveURL(/\/credits$/);
		await expect(page.getByRole("heading", { name: "Credits", level: 1 })).toBeVisible();
	});
});
