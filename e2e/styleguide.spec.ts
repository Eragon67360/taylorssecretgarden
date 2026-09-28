import type { Page } from "@playwright/test";

import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow, expectReducedMotion } from "./checks";
import { expect, test } from "./fixtures";

// The development styleguide (/styleguide): every scrapbook kit component in
// several Eras. Production serves it only with ENABLE_STYLEGUIDE=1, which the
// Playwright web server and CI set.
const KIT = [
	"Paper",
	"Washi tape",
	"Pin",
	"Polaroid",
	"Bracelet",
	"Pressed flowers",
	"Scribble",
	"Arrow",
	"Highlight",
	"Sticky note",
	"Rubber stamp",
	"Ticket stub",
	"Ruled list",
];

const ERAS = [
	"Taylor Swift",
	"Fearless",
	"Speak Now",
	"Red",
	"1989",
	"reputation",
	"Lover",
	"folklore",
	"evermore",
	"Midnights",
	"The Tortured Poets Department",
];

const sandbox = (page: Page) => page.getByRole("region", { name: "Era sandbox" });
const background = (page: Page) => sandbox(page).evaluate((element) => getComputedStyle(element).backgroundColor);

/** Whether a web font whose family name contains `name` has been downloaded. */
const fontLoaded = (page: Page, name: string) =>
	page.evaluate((name) => {
		const pattern = new RegExp(name.replace(/ /g, "[ _]"), "i");
		let loaded = false;

		document.fonts.forEach((face) => {
			if (pattern.test(face.family) && !/fallback/i.test(face.family) && face.status === "loaded") loaded = true;
		});

		return loaded;
	}, name);

test.describe("Styleguide", () => {
	test("shows every kit component in several Eras", async ({ page }) => {
		const response = await page.goto("/styleguide");

		expect(response?.status()).toBe(200);
		await expect(page.getByRole("heading", { level: 1, name: "Styleguide" })).toBeVisible();

		const spreads = page.locator("[data-era]").filter({ has: page.getByRole("heading", { name: "Paper", exact: true }) });

		expect(await spreads.count()).toBeGreaterThanOrEqual(3);
		for (let index = 0; index < (await spreads.count()); index++) {
			for (const component of KIT) {
				await expect(spreads.nth(index).getByRole("heading", { name: component, exact: true })).toBeAttached();
			}
		}
	});

	test("shows the palette of every Era", async ({ page }) => {
		await page.goto("/styleguide");
		const palettes = page.getByRole("region", { name: "Era palettes" });

		for (const era of ERAS) {
			await expect(palettes.getByRole("heading", { name: era, exact: true })).toBeVisible();
		}
	});

	test("passes axe (WCAG 2.1 AA), every Era palette included", async ({ page }) => {
		await page.goto("/styleguide");
		await expectNoAxeViolations(page);
	});

	test("fits a 390px phone", async ({ page }) => {
		await page.setViewportSize(PHONE);
		await page.goto("/styleguide");
		await expectNoHorizontalOverflow(page);
	});

	test("is still under reduced motion", async ({ page }) => {
		await page.goto("/styleguide");
		await expectReducedMotion(page);
	});

	test("decorations are hidden from assistive tech, meaningful pieces are labelled", async ({ page }) => {
		await page.goto("/styleguide");

		const unlabelled = await page.evaluate(() =>
			[...document.querySelectorAll("main svg")]
				.filter((svg) => !svg.closest("[aria-hidden='true']") && !svg.closest("[role='img'][aria-label]"))
				.map((svg) => svg.outerHTML.slice(0, 80)),
		);

		expect(unlabelled, "SVGs exposed to assistive tech without a label").toEqual([]);
		await expect(page.getByRole("img", { name: "Swiftie", exact: true }).first()).toBeVisible();
		await expect(page.getByRole("img", { name: /NOT Taylor's Version/i }).first()).toBeVisible();
	});

	test("picking an Era re-themes the sandbox with a colour transition", async ({ page }) => {
		await page.goto("/styleguide");
		const before = await background(page);

		await sandbox(page).getByRole("radio", { name: "Midnights" }).check();
		// The Era's colour variables transition (a CSS transition on the container).
		expect(await sandbox(page).evaluate((element) => element.getAnimations().length)).toBeGreaterThan(0);
		await expect(sandbox(page).getByRole("heading", { level: 2, name: "Midnights" })).toBeVisible();
		await expect.poll(() => background(page)).not.toBe(before);
		await expect.poll(() => background(page)).toBe("rgb(19, 29, 54)");
	});

	test("under reduced motion the re-theme is instant", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/styleguide");

		await sandbox(page).getByRole("radio", { name: "Midnights" }).check();
		expect(await background(page)).toBe("rgb(19, 29, 54)");
		expect(await sandbox(page).evaluate((element) => element.getAnimations().length)).toBe(0);
	});

	test("an Era's display face is downloaded only once that Era is shown", async ({ page }) => {
		await page.goto("/styleguide");
		await page.evaluate(() => document.fonts.ready);
		expect(await fontLoaded(page, "Special Elite"), "TTPD face before TTPD is shown").toBe(false);

		await sandbox(page).getByRole("radio", { name: "The Tortured Poets Department" }).check();
		await expect.poll(() => fontLoaded(page, "Special Elite"), { message: "TTPD face once TTPD is shown" }).toBe(true);
	});
});

test("a page without an Era downloads no Era display face, only the journal faces", async ({ page }) => {
	await page.goto("/");
	await page.evaluate(() => document.fonts.ready);

	// reputation's face (UnifrakturMaguntia) is left out: the old Tour pages use it too.
	for (const face of ["Rye", "Cinzel", "Pinyon Script", "Abril Fatface", "Permanent Marker", "Pacifico", "IM Fell", "Cormorant", "Bodoni Moda", "Special Elite"]) {
		expect(await fontLoaded(page, face), `${face} on /`).toBe(false);
	}
	// The site chrome writes in the journal's pen (Caveat) and text face (Karla).
	for (const face of ["Caveat", "Karla"]) {
		await expect.poll(() => fontLoaded(page, face), { message: `${face} on /` }).toBe(true);
	}
});
