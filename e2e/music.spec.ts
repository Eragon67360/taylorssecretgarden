import type { Locator, Page } from "@playwright/test";

import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow, expectReducedMotion } from "./checks";
import { expect, test } from "./fixtures";

// Albums are named from the curated catalogue (lib/catalogue.ts), not from
// Deezer, whose titles vary by catalog region; URLs use curated IDs.
const IDS = {
	reputation: "52612062",
	folklore: "167766152",
	midnights: "446218925",
	showgirl: "1103662682",
	/** Fearless (International Version), another version of the Fearless Album. */
	fearlessInternational: "283925",
	midnights3am: "368506677",
};

/** The shelf, in Era order: each Taylor's Version right after its original. */
const SHELF: { name: string; id: string; era: string }[] = [
	{ name: "Taylor Swift", id: "227786", era: "debut" },
	{ name: "Fearless", id: "426350", era: "fearless" },
	{ name: "Fearless (Taylor's Version)", id: "221543452", era: "fearless" },
	{ name: "Speak Now", id: "689149", era: "speak-now" },
	{ name: "Speak Now (Taylor's Version)", id: "461146065", era: "speak-now" },
	{ name: "Red", id: "68491961", era: "red" },
	{ name: "Red (Taylor's Version)", id: "272247412", era: "red" },
	{ name: "1989", id: "9007781", era: "1989" },
	{ name: "1989 (Taylor's Version)", id: "505316961", era: "1989" },
	{ name: "reputation", id: "52612062", era: "reputation" },
	{ name: "Lover", id: "108447472", era: "lover" },
	{ name: "folklore", id: "167766152", era: "folklore" },
	{ name: "evermore", id: "198167862", era: "evermore" },
	{ name: "Midnights", id: "446218925", era: "midnights" },
	{ name: "The Tortured Poets Department", id: "575252501", era: "ttpd" },
	{ name: "The Life of a Showgirl", id: "1103662682", era: "showgirl" },
];
const ERA_COUNT = new Set(SHELF.map(({ era }) => era)).size;

const shelf = (page: Page) => page.getByRole("list", { name: "Albums" });
/** The open Album's versions, under its title. */
const versions = (page: Page, album: string) => page.getByRole("list", { name: `Versions of ${album}` });
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
	test("shows the sixteen Albums as polaroids on a shelf, covers loaded", async ({ page }) => {
		await page.goto("/music");

		const covers = shelf(page).locator("img");

		await expect(shelf(page).getByRole("link")).toHaveCount(16);
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

	test("lists the Albums in Era order, each Taylor's Version right after its original with a handwritten tag", async ({ page }) => {
		await page.goto("/music");

		const links = shelf(page).getByRole("link");

		expect(await links.evaluateAll((all) => all.map((link) => link.getAttribute("aria-label")))).toEqual(SHELF.map(({ name }) => name));
		for (const { name } of SHELF) {
			const tag = polaroid(page, name).getByText("Taylor's Version", { exact: true });

			await expect(tag, `${name}'s tag`).toHaveCount(name.includes("(Taylor's Version)") ? 1 : 0);
		}
	});

	test("a Taylor's Version wears its original's Era look", async ({ page }) => {
		test.setTimeout(120_000);
		await page.goto("/music");

		for (const [index, tv] of SHELF.entries()) {
			if (!tv.name.includes("(Taylor's Version)")) continue;
			const original = SHELF[index - 1];

			await polaroid(page, original.name).click();
			await expect(eraPage(page)).toHaveAttribute("data-era", original.era);
			await expect(polaroid(page, original.name)).toHaveAttribute("aria-current", "true");
			await page.waitForTimeout(800);
			const paper = await background(eraPage(page));

			await polaroid(page, tv.name).click();
			await expect(page).toHaveURL(`/music?album=${tv.id}`);
			await expect(eraPage(page)).toHaveAttribute("data-era", original.era);
			await expect(page.getByText("(Taylor's Version)", { exact: true })).toBeVisible();
			await expect.poll(() => background(eraPage(page))).toBe(paper);
		}
	});

	test("The Life of a Showgirl is Era No. 12, with its own look and its Encore edition", async ({ page }) => {
		await page.goto(`/music?album=${IDS.showgirl}`);

		await expectAlbumShown(page, "The Life of a Showgirl");
		await expect(eraPage(page)).toHaveAttribute("data-era", "showgirl");
		await expect(eraBracelet(page, "Showgirl")).toBeVisible();
		await expect(page.getByText(/Era No\. 12 · 2025/)).toBeVisible();
		await expect(page.getByText("The Encore", { exact: true })).toBeVisible();
		// Mint-water paper (lib/eras.ts).
		await expect.poll(() => background(eraPage(page))).toBe("rgb(221, 241, 234)");
		await expect(page.getByRole("definition").nth(1)).toHaveText("16");
	});

	test("each Album is shown in its most complete edition, named on the page", async ({ page }) => {
		await page.goto(`/music?album=${IDS.midnights}`);

		await expectAlbumShown(page, "Midnights");
		await expect(page.getByText("The Til Dawn Edition", { exact: true })).toBeVisible();
		await expect(page.getByRole("definition").nth(1)).toHaveText("23");
	});

	test("every Album has a working ?album deep link", async ({ page }) => {
		test.setTimeout(180_000);
		for (const { name, id, era } of SHELF) {
			await page.goto(`/music?album=${id}`);
			await expect(polaroid(page, name), name).toHaveAttribute("aria-current", "true");
			await expect(eraPage(page)).toHaveAttribute("data-era", era);
		}
	});

	test("a deep link to another version of an Album opens that Album on that version", async ({ page }) => {
		await page.goto(`/music?album=${IDS.fearlessInternational}`);

		await expect(polaroid(page, "Fearless")).toHaveAttribute("aria-current", "true");
		await expect(eraPage(page)).toHaveAttribute("data-era", "fearless");
		await expectAlbumShown(page, "Fearless");
		await expect(versions(page, "Fearless").getByRole("link", { name: /International Version/ })).toHaveAttribute("aria-current", "true");
		await expect(page.getByRole("definition").nth(0)).toHaveText("March 9, 2009");
		await expect(page.getByRole("definition").nth(1)).toHaveText("16");
	});

	test("an open Album lists every version; picking one switches the cover, facts and tracklist in place", async ({ page }) => {
		await page.goto(`/music?album=${IDS.midnights}`);
		await expectAlbumShown(page, "Midnights");

		const list = versions(page, "Midnights");

		await expect(list.getByRole("link")).toHaveCount(3);
		await expect(list.getByRole("link", { name: /The Til Dawn Edition/ })).toHaveAttribute("aria-current", "true");

		await list.getByRole("link", { name: /3am Edition/ }).click();
		await expect(page).toHaveURL(`/music?album=${IDS.midnights3am}`);
		await expect(list.getByRole("link", { name: /3am Edition/ })).toHaveAttribute("aria-current", "true");
		await expect(page.getByText("3am Edition", { exact: true }).first()).toBeVisible();
		await expect(page.getByRole("definition").nth(1)).toHaveText("20");
		await expect(page.getByRole("img", { name: /3am Edition, Album cover/ })).toBeVisible();
		// Still the Midnights Album, in its Era.
		await expect(polaroid(page, "Midnights")).toHaveAttribute("aria-current", "true");
		await expect(eraPage(page)).toHaveAttribute("data-era", "midnights");
		await expectNoAxeViolations(page);

		await list.getByRole("link", { name: /The Til Dawn Edition/ }).click();
		await expect(page).toHaveURL(`/music?album=${IDS.midnights}`);
		await expect(page.getByRole("definition").nth(1)).toHaveText("23");
	});

	test("an Album with a single version shows no list of versions", async ({ page }) => {
		await page.goto(`/music?album=${IDS.reputation}`);
		await expectAlbumShown(page, "reputation");

		await expect(versions(page, "reputation")).toHaveCount(0);
		await expect(page.getByText(/^every version/)).toHaveCount(0);
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

		expect(names).toHaveLength(SHELF.length);
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
		expect(eras.size).toBe(ERA_COUNT);
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

	test("the Albums route returns the curated catalogue, in Era order", async ({ request }) => {
		const response = await request.get("/api/albums");

		expect(response.status()).toBe(200);
		const { items } = (await response.json()) as {
			items: {
				id: string;
				name: string;
				era: string;
				taylorsVersion: boolean;
				reRecords: string | null;
				year: number;
				edition: string | null;
				versions: { id: string; name: string; released: string }[];
			}[];
		};

		expect(items.map(({ name, era }) => ({ name, era }))).toEqual(SHELF.map(({ name, era }) => ({ name, era })));
		expect(new Set(items.map(({ era }) => era)).size).toBe(ERA_COUNT);
		for (const [index, album] of items.entries()) {
			expect(album.year, `${album.name}'s release year`).toBeGreaterThanOrEqual(2006);
			if (!album.taylorsVersion) continue;
			// A Taylor's Version re-records the Album right before it, in the same Era.
			expect(album.reRecords).toBe(items[index - 1].id);
			expect(album.era).toBe(items[index - 1].era);
		}
		expect(items.find(({ name }) => name === "The Life of a Showgirl")).toMatchObject({ edition: "The Encore", year: 2025 });
		expect(items.find(({ name }) => name === "folklore")).toMatchObject({
			versions: expect.arrayContaining([expect.objectContaining({ id: "188803732", name: "The Long Pond Studio Sessions" })]),
		});
	});
});
