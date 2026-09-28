import type { Locator, Page } from "@playwright/test";

import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow, expectReducedMotion } from "./checks";
import { expect, test } from "./fixtures";

// Deezer titles some Albums differently by catalog region (the debut is
// "Taylor Swift (Deluxe Edition)" in Europe, "Taylor Swift" in the US), and
// may answer a curated ID with a regional twin that has another ID. These
// tests only name Albums whose titles are the same everywhere, and only use
// curated IDs in URLs.
const IDS = { debut: "227786", reputation: "52612062", folklore: "162683632", midnights: "368474187" };

const shelf = (page: Page) => page.getByRole("list", { name: "Albums" });
const polaroid = (page: Page, name: string) => shelf(page).getByRole("link", { name, exact: true });
/** The Era's name, spelled in bracelet beads. */
const eraBracelet = (page: Page, era: string) => page.getByRole("img", { name: era, exact: true });
/** The page, printed on the current Era's paper. */
const eraPage = (page: Page) => page.locator("main [data-era]").first();
const audio = (page: Page) => page.locator("audio");
const playButtons = (page: Page) => page.getByRole("button", { name: /^Play preview of / });
const pauseButtons = (page: Page) => page.getByRole("button", { name: /^Pause preview of / });
/** Every track's preview button, playing or not. */
const previewButtons = (page: Page) => page.getByRole("button", { name: /^(Play|Pause) preview of / });

async function background(locator: Locator) {
	return locator.evaluate((element) => getComputedStyle(element).backgroundColor);
}

/** Waits until the selected Album's details (title and tracklist) are on the page. */
async function expectAlbumShown(page: Page, title: string | RegExp) {
	await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
	await expect(playButtons(page).first()).toBeVisible();
}

test.describe("Music", () => {
	test("shows the eleven Albums as polaroids on a shelf, covers loaded", async ({ page }) => {
		await page.goto("/music");

		const covers = shelf(page).locator("img");

		await expect(shelf(page).getByRole("link")).toHaveCount(11);
		for (const cover of await covers.all()) {
			await cover.scrollIntoViewIfNeeded();
			await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
		}
	});

	test("opens on the debut Album by default", async ({ page }) => {
		await page.goto("/music");

		await expect(eraBracelet(page, "debut")).toBeVisible();
		await expect(page.getByRole("heading", { level: 2, name: /^Taylor Swift/ })).toBeVisible();
		await expect(shelf(page).locator("[aria-current=true]")).toHaveCount(1);
		await expect(eraPage(page)).toHaveAttribute("data-era", "debut");
	});

	test("selecting an Album shows its Era name, re-themes the page and puts the Album in the URL", async ({ page }) => {
		await page.goto("/music");
		await expectAlbumShown(page, /^Taylor Swift/);
		const debutPaper = await background(eraPage(page));

		await polaroid(page, "reputation").click();

		await expect(page).toHaveURL(`/music?album=${IDS.reputation}`);
		await expect(eraBracelet(page, "reputation")).toBeVisible();
		await expectAlbumShown(page, "reputation");
		await expect(page.getByText("...Ready For It?", { exact: true })).toBeVisible();
		await expect(polaroid(page, "reputation")).toHaveAttribute("aria-current", "true");
		// reputation is printed on black paper (lib/eras.ts), after a short fade.
		await expect.poll(() => background(eraPage(page))).toBe("rgb(22, 22, 22)");
		expect(debutPaper).not.toBe("rgb(22, 22, 22)");

		await polaroid(page, "folklore").click();

		await expect(page).toHaveURL(`/music?album=${IDS.folklore}`);
		await expect(eraBracelet(page, "folklore")).toBeVisible();
		await expectAlbumShown(page, "folklore");
		await expect(page.getByText("cardigan", { exact: true })).toBeVisible();
		await expect(page.getByText("...Ready For It?", { exact: true })).toBeHidden();
		await expect.poll(() => background(eraPage(page))).toBe("rgb(228, 227, 224)");
	});

	test("Fearless (Taylor's Version) is in the Fearless Era", async ({ page }) => {
		await page.goto("/music");

		await polaroid(page, "Fearless (Taylor's Version)").click();

		await expectAlbumShown(page, /^Fearless/);
		await expect(eraBracelet(page, "Fearless")).toBeVisible();
		await expect(page.getByText(/Era No\. 02/)).toBeVisible();
		await expect(eraPage(page)).toHaveAttribute("data-era", "fearless");
	});

	test("a ?album deep link opens that Album", async ({ page }) => {
		await page.goto(`/music?album=${IDS.midnights}`);

		await expect(eraBracelet(page, "Midnights")).toBeVisible();
		await expectAlbumShown(page, /^Midnights/);
		await expect(polaroid(page, "Midnights")).toHaveAttribute("aria-current", "true");
		await expect(eraPage(page)).toHaveAttribute("data-era", "midnights");
	});

	test("an unknown ?album falls back to the debut Album", async ({ page }) => {
		const response = await page.goto("/music?album=not-an-album");

		expect(response?.status()).toBe(200);
		await expect(eraBracelet(page, "debut")).toBeVisible();
	});

	test("the Album details show the release date, songs, running time and label", async ({ page }) => {
		await page.goto(`/music?album=${IDS.reputation}`);

		const facts = page.getByRole("definition");

		await expect(page.getByRole("term")).toHaveText(["Released", "Songs", "Running time", "Label"]);
		await expect(facts.nth(0)).toHaveText(/^[A-Z][a-z]+ \d{1,2}, 2017$/);
		await expect(facts.nth(1)).toHaveText("15");
		await expect(facts.nth(2)).toHaveText(/^\d+ min$/);
		await expect(facts.nth(3)).not.toBeEmpty();
	});

	test.describe("previews", () => {
		test("play one track at a time, with a visible playing state and progress", async ({ page }) => {
			await page.goto(`/music?album=${IDS.reputation}`);
			await expectAlbumShown(page, "reputation");

			await playButtons(page).nth(0).click();
			await expect(pauseButtons(page)).toHaveCount(1);
			await expect.poll(() => audio(page).evaluate((element: HTMLAudioElement) => element.paused)).toBe(false);
			await expect(page.getByText("now playing")).toBeVisible();
			const progress = page.getByRole("progressbar");

			await expect(progress).toBeVisible();
			// The preview streams from Deezer, which can take a while under load.
			await expect.poll(async () => Number(await progress.getAttribute("aria-valuenow")), { timeout: 30_000 }).toBeGreaterThan(0);

			await previewButtons(page).nth(1).click();
			// One preview only: the second track plays, the first stopped.
			await expect(pauseButtons(page)).toHaveCount(1);
			await expect(pauseButtons(page)).toHaveAccessibleName("Pause preview of End Game");
			await expect(page.getByText("now playing")).toHaveCount(1);
			await expect(page.locator("audio")).toHaveCount(1);
			await expect.poll(() => audio(page).evaluate((element: HTMLAudioElement) => element.paused)).toBe(false);

			await pauseButtons(page).click();
			await expect(pauseButtons(page)).toHaveCount(0);
			await expect.poll(() => audio(page).evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
		});

		test("switching Album stops playback", async ({ page }) => {
			await page.goto(`/music?album=${IDS.reputation}`);
			await expectAlbumShown(page, "reputation");

			await playButtons(page).nth(0).click();
			await expect.poll(() => audio(page).evaluate((element: HTMLAudioElement) => element.paused)).toBe(false);

			await polaroid(page, "folklore").click();

			await expect.poll(() => audio(page).evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
			await expectAlbumShown(page, "folklore");
			await expect(pauseButtons(page)).toHaveCount(0);
			await expect(page.getByText("now playing")).toHaveCount(0);
		});

		test("are keyboard operable", async ({ page }) => {
			await page.goto(`/music?album=${IDS.folklore}`);
			await expectAlbumShown(page, "folklore");

			await playButtons(page).nth(0).focus();
			await page.keyboard.press("Enter");
			await expect(pauseButtons(page)).toHaveCount(1);
			await expect(pauseButtons(page)).toBeFocused();
			await expect.poll(() => audio(page).evaluate((element: HTMLAudioElement) => element.paused)).toBe(false);

			await page.keyboard.press("Space");
			await expect(pauseButtons(page)).toHaveCount(0);
			await expect.poll(() => audio(page).evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
		});
	});

	test("passes axe in every Era", async ({ page }) => {
		test.setTimeout(180_000);
		await page.goto("/music");

		const names = await shelf(page).getByRole("link").evaluateAll((links) => links.map((link) => link.getAttribute("aria-label")!));
		const eras = new Set<string>();

		expect(names).toHaveLength(11);
		for (const name of names) {
			await polaroid(page, name).click();
			await expect(polaroid(page, name)).toHaveAttribute("aria-current", "true");
			await expect(playButtons(page).first()).toBeVisible();
			const era = (await eraPage(page).getAttribute("data-era"))!;

			eras.add(era);
			// Let the colour fade settle before measuring contrast.
			await page.waitForTimeout(800);
			await test.step(`axe in the ${era} Era`, () => expectNoAxeViolations(page));
		}
		expect(eras.size).toBe(11);
	});

	test("fits a 390px phone", async ({ page }) => {
		await page.setViewportSize(PHONE);
		await page.goto(`/music?album=${IDS.midnights}`);
		await expectAlbumShown(page, /^Midnights/);
		await expectNoHorizontalOverflow(page);
		// The selected polaroid is scrolled into view on the shelf.
		await expect(polaroid(page, "Midnights")).toBeInViewport();
	});

	test("is still under reduced motion", async ({ page }) => {
		await page.goto(`/music?album=${IDS.folklore}`);
		await expectReducedMotion(page);
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
