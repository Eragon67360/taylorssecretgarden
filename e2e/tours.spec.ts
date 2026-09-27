import tours from "../public/json/tours.json";

import { expect, test } from "./fixtures";

test.describe("Tours", () => {
	test("lists every Tour on the timeline", async ({ page }) => {
		await page.goto("/tours");

		for (const { tour, date } of tours) {
			await expect(page.getByText(`${tour} ${date}`, { exact: true })).toBeAttached();
		}
	});

	test("every Tour on the timeline links to its Tour page", async ({ page }) => {
		await page.goto("/tours");

		// Each Tour page itself is checked in routes.spec.ts; here, the timeline
		// must link to it, in timeline order.
		const links = page.getByRole("link").filter({ has: page.getByRole("img", { name: /^Tour \d+$/ }) });

		await expect(links).toHaveCount(tours.length);
		for (let index = 0; index < tours.length; index++) {
			await expect(links.nth(index)).toHaveAttribute("href", `/tours/${tours[index].slug}`);
		}
	});

	test("scrolling the whole timeline raises no page error", async ({ page }) => {
		// Expected failure: reaching the end of the timeline reads the video of a
		// Tour past the end of the list ("Cannot read properties of undefined
		// (reading 'videoUrl')"). #8 fixes it and must flip this test.
		test.fail(true, "Tours timeline throws at the end; fixed by #8");

		await page.goto("/tours");
		await expect(page.getByRole("heading", { name: "Tours", exact: true })).toBeVisible();

		// Scroll step by step so the timeline passes every Tour, then to the very end.
		const height = await page.evaluate(() => document.documentElement.scrollHeight);

		for (let y = 0; y <= height; y += 300) {
			await page.mouse.wheel(0, 300);
			await page.waitForTimeout(50);
		}
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		await page.waitForTimeout(2000);
	});
});
