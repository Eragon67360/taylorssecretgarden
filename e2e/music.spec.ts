import { expect, test } from "./fixtures";

// Deezer titles some Albums differently by catalog region (the debut is
// "Taylor Swift (Deluxe Edition)" in Europe, "Taylor Swift" in the US), so
// these tests only name Albums whose titles are the same everywhere.
test.describe("Music", () => {
	test("shows at least 10 curated Album covers", async ({ page }) => {
		await page.goto("/music");

		const covers = page.getByRole("button").getByRole("img", { name: /^Cover Album / });

		await expect(covers.nth(9)).toBeVisible();
		expect(await covers.count()).toBeGreaterThanOrEqual(10);

		// The cover images actually loaded, not just their alt text.
		for (const cover of (await covers.all()).slice(0, 10)) {
			await cover.scrollIntoViewIfNeeded();
			await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
		}
	});

	test("selecting an Album shows its tracklist", async ({ page }) => {
		await page.goto("/music");

		await page.getByRole("button", { name: "Cover Album reputation" }).click();

		await expect(page.getByRole("heading", { name: "reputation", exact: true })).toBeVisible();
		await expect(page.getByText("...Ready For It?", { exact: true })).toBeVisible();
		await expect(page.getByText("Look What You Made Me Do", { exact: true })).toBeVisible();

		await page.getByRole("button", { name: "Cover Album folklore" }).click();

		await expect(page.getByRole("heading", { name: "folklore", exact: true })).toBeVisible();
		await expect(page.getByText("cardigan", { exact: true })).toBeVisible();
		await expect(page.getByText("Look What You Made Me Do", { exact: true })).toBeHidden();
	});

	test("Album details show no placeholder controls", async ({ page }) => {
		await page.goto("/music");

		await page.getByRole("button", { name: "Cover Album reputation" }).click();
		await expect(page.getByRole("heading", { name: "reputation", exact: true })).toBeVisible();
		await expect(page.getByText("Label:")).toBeVisible();

		// Streaming icons that linked nowhere, an always-empty "Produced by"
		// field and grey music-video boxes with nothing in them.
		await expect(page.getByRole("heading", { name: "Stream" })).toHaveCount(0);
		await expect(page.getByText("Produced by")).toHaveCount(0);
		await expect(page.getByRole("heading", { name: "Music videos" })).toHaveCount(0);
	});

	test("the Albums route returns the curated Albums", async ({ request }) => {
		const response = await request.get("/api/albums");

		expect(response.status()).toBe(200);
		const { items } = await response.json();
		const names = items.map((album: { name: string }) => album.name);

		expect(names.length).toBeGreaterThanOrEqual(10);
		expect(names).toEqual(expect.arrayContaining(["reputation", "folklore", "Midnights"]));
	});

	test("every curated Album belongs to an Era, and every Era has one Album", async ({ request }) => {
		// Deezer may answer a curated ID with a regional twin (another ID for the
		// same Album), so the route falls back to the title to find the Era.
		const { items } = (await (await request.get("/api/albums")).json()) as { items: { id: string; name: string; era: string | null }[] };
		const eraNames: Record<string, string> = {
			debut: "Taylor Swift",
			fearless: "Fearless",
			"speak-now": "Speak Now",
			red: "Red",
			"1989": "1989",
			reputation: "reputation",
			lover: "Lover",
			folklore: "folklore",
			evermore: "evermore",
			midnights: "Midnights",
			ttpd: "The Tortured Poets Department",
		};

		for (const { id, name, era } of items) {
			expect(era, `Era of ${name} (${id})`).not.toBeNull();
			// A Taylor's Version shares its original's Era; TTPD's Anthology is TTPD.
			expect(name.toLowerCase(), `${name} is in the ${era} Era`).toContain(eraNames[era!].toLowerCase());
		}
		expect(items.map(({ era }) => era).sort()).toEqual(Object.keys(eraNames).sort());
	});
});
