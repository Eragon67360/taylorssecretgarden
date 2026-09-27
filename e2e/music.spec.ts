import { expect, test } from "./fixtures";

test.describe("Music", () => {
	test("shows at least 10 curated Album covers", async ({ page }) => {
		await page.goto("/music");

		const covers = page.getByRole("button").getByRole("img", { name: /^Cover Album / });

		await expect(covers.nth(9)).toBeVisible();
		expect(await covers.count()).toBeGreaterThanOrEqual(10);
	});

	test("selecting another Album shows its tracklist", async ({ page }) => {
		await page.goto("/music");

		// The debut Album is selected by default.
		await expect(page.getByRole("heading", { name: "Taylor Swift (Deluxe Edition)" })).toBeVisible();
		await expect(page.getByText("Tim McGraw", { exact: true })).toBeVisible();

		await page.getByRole("button", { name: "Cover Album reputation" }).click();

		await expect(page.getByRole("heading", { name: "reputation", exact: true })).toBeVisible();
		await expect(page.getByText("...Ready For It?", { exact: true })).toBeVisible();
		await expect(page.getByText("Look What You Made Me Do", { exact: true })).toBeVisible();
		await expect(page.getByText("Tim McGraw", { exact: true })).toBeHidden();
	});

	test("the Albums route returns the curated Albums", async ({ request }) => {
		const response = await request.get("/api/albums");

		expect(response.status()).toBe(200);
		const { items } = await response.json();
		const names = items.map((album: { name: string }) => album.name);

		expect(names.length).toBeGreaterThanOrEqual(10);
		expect(names).toEqual(expect.arrayContaining(["reputation", "folklore", "Midnights"]));
	});
});
