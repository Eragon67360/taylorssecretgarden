import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// What a browser tab, a home screen and a link preview show: the title and
// description, the pressed-flower icons and the Open Graph card.

/** A tag's URL attribute, as a path on this server (metadata URLs are absolute, on the production host). */
async function pathOf(page: Page, selector: string, attribute: "href" | "content") {
	const value = await page.locator(selector).getAttribute(attribute);

	expect(value, `${selector} ${attribute}`).toBeTruthy();
	const { pathname, search } = new URL(value!, page.url());

	return pathname + search;
}

test.describe("site metadata", () => {
	test("names and describes Taylor's Secret Garden", async ({ page }) => {
		await page.goto("/");

		await expect(page).toHaveTitle(/^Taylor's Secret Garden/);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /scrapbook of every Taylor Swift Era/);

		await page.goto("/music");
		await expect(page).toHaveTitle("Music · Taylor's Secret Garden");
	});

	test("links an icon and a home-screen icon that load", async ({ page, request }) => {
		await page.goto("/");

		const icon = await request.get(await pathOf(page, 'link[rel="icon"]', "href"));

		expect(icon.status()).toBe(200);
		expect(icon.headers()["content-type"]).toContain("image/svg+xml");

		const appleIcon = await request.get(await pathOf(page, 'link[rel="apple-touch-icon"]', "href"));

		expect(appleIcon.status()).toBe(200);
		expect(appleIcon.headers()["content-type"]).toBe("image/png");
	});

	test("has an Open Graph card and a large X card", async ({ page, request }) => {
		await page.goto("/tours");

		await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /Taylor's Secret Garden/);
		await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");

		const card = await request.get(await pathOf(page, 'meta[property="og:image"]', "content"));

		expect(card.status()).toBe(200);
		expect(card.headers()["content-type"]).toBe("image/png");
		expect((await card.body()).length).toBeGreaterThan(10_000);
	});
});
