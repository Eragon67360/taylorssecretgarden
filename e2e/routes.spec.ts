import tours from "../public/json/tours.json";

import { expect, test } from "./fixtures";

// Every public route answers 200 and shows its main heading, with no page
// errors or console errors (checked by the fixture).
const routes = [
	{ path: "/", heading: "Taylor Swift" },
	{ path: "/music", heading: "Albums" },
	{ path: "/tours", heading: "Tours" },
	{ path: "/sign-in", heading: "Sign in to Taylor's Secret Garden" },
];

for (const { path, heading } of routes) {
	test(`${path} shows "${heading}"`, async ({ page }) => {
		const response = await page.goto(path);

		expect(response?.status()).toBe(200);
		await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
	});
}

for (const { slug, tour } of tours) {
	test(`Tour page /tours/${slug} shows ${tour}`, async ({ page }) => {
		const response = await page.goto(`/tours/${slug}`);

		expect(response?.status()).toBe(200);
		await expect(page.getByRole("heading", { name: tour, exact: true })).toBeVisible();
	});
}

test("Swiftter (/forum) shows the feed without an error page", async ({ page }) => {
	// Known failure: Swiftter's Supabase database no longer exists, so the feed
	// requests fail and the page falls back to the error boundary. #12 rebuilds
	// Swiftter on Neon and must flip this test.
	test.fail(true, "Swiftter's database is gone; fixed by #12");

	const response = await page.goto("/forum");

	expect(response?.status()).toBe(200);
	await page.waitForLoadState("networkidle");
	await expect(page.getByRole("heading", { name: "Something went wrong!" })).toBeHidden();
});
