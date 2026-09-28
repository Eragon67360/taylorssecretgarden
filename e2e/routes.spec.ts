import tours from "../public/json/tours.json";

import { expect, test } from "./fixtures";

// Every public route answers 200 and shows its main heading, with no page
// errors or console errors (checked by the fixture).
const routes = [
	{ path: "/", heading: "Taylor Swift" },
	{ path: "/music", heading: "pick an Era. the page changes outfits." },
	{ path: "/tours", heading: "Tours" },
	{ path: "/swiftter", heading: "Swiftter" },
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

test("Swiftter shows the feed without an error page", async ({ page }) => {
	const response = await page.goto("/swiftter");

	expect(response?.status()).toBe(200);
	await expect(page.getByRole("feed", { name: "Posts" }).getByRole("article").first()).toBeVisible();
	await expect(page.getByRole("heading", { name: "Something went wrong!" })).toBeHidden();
});
