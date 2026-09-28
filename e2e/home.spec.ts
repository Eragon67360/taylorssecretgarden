import type { Page } from "@playwright/test";

import tours from "../public/json/tours.json";

import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow, expectReducedMotion } from "./checks";
import { expect, test } from "./fixtures";

// Home: the journal's opening spread (#20).
const waysIn = (page: Page) => page.getByRole("region", { name: "Three ways into the garden" });
const gallery = (page: Page) => page.getByRole("region", { name: "Every Era, pressed and kept" });
const tourWall = (page: Page) => page.getByRole("region", { name: "Posters from the bedroom wall" });

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

test.describe("Home", () => {
	test("opens on the journal's first spread: title, taped photo, sticky note and stamp", async ({ page }) => {
		await page.goto("/");

		await expect(page.getByRole("heading", { level: 1, name: "Taylor's Secret Garden" })).toBeVisible();
		await expect(page.getByRole("img", { name: /Taylor Swift singing on stage/ })).toBeVisible();
		await expect(page.getByText("Who is Taylor Swift anyway?")).toBeVisible();
		await expect(page.getByRole("img", { name: /Stamp: This is NOT Taylor's Version/i })).toBeVisible();
	});

	test("the taped photo, the first screen's largest picture, is fetched first and sized for the screen", async ({ page }) => {
		await page.goto("/");

		const photo = page.getByRole("img", { name: /Taylor Swift singing on stage/ });

		await expect(photo).toHaveAttribute("fetchpriority", "high");
		await expect(photo).toHaveAttribute("loading", "eager");
		// A width per screen, picked by `sizes`, not one large file for every phone.
		await expect(photo).toHaveAttribute("sizes", /\dvw/);
		await expect(photo).toHaveAttribute("srcset", /\s\d+w,/);
	});

	test("nothing else is fetched for the next page until the visitor shows interest in a link", async ({ page }) => {
		const prefetches: string[] = [];

		// A page prefetched by the router: its payload (?_rsc=…).
		page.on("request", (request) => {
			if (new URL(request.url()).searchParams.has("_rsc")) prefetches.push(request.url());
		});
		await page.goto("/", { waitUntil: "load" });
		await page.waitForTimeout(1500);
		expect(prefetches, "no page is prefetched as the first screen loads").toEqual([]);

		await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Tours" }).hover();
		await expect.poll(() => prefetches.some((url) => new URL(url).pathname === "/tours")).toBe(true);
	});

	test("the sticky note is handwritten in a loaded web font, not a system fallback", async ({ page }) => {
		await page.goto("/");

		const note = page.getByText("Who is Taylor Swift anyway?");

		await expect(note).toBeVisible();

		const { family, loaded } = await note.evaluate(async (element) => {
			await document.fonts.ready;
			const unquote = (name: string) => name.trim().replace(/^["']|["']$/g, "");
			const family = unquote(getComputedStyle(element).fontFamily.split(",")[0]);
			let loaded = false;

			document.fonts.forEach((face) => {
				if (unquote(face.family) === family && face.status === "loaded") loaded = true;
			});

			return { family, loaded };
		});

		expect(loaded, `sticky note font "${family}" is a loaded web font`).toBe(true);
	});

	test("the three entry points lead to Music, Tours and Swiftter", async ({ page }) => {
		for (const { name, path, section } of [
			{ name: "The music journal", path: "/music", section: "Music" },
			{ name: "The Tours", path: "/tours", section: "Tours" },
			{ name: "Swiftter", path: "/swiftter", section: "Swiftter" },
		]) {
			await page.goto("/");
			await waysIn(page).getByRole("link", { name, exact: true }).click();
			await expect(page).toHaveURL(path);
			// The page arrived at is the one the journal's tabs mark as current.
			await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: section })).toHaveAttribute(
				"aria-current",
				"page",
			);
		}
	});

	test("the gallery shows the twelve Eras, each linking to Music with its Album selected", async ({ page }) => {
		await page.goto("/");
		const eras = gallery(page).getByRole("link");

		await expect(eras).toHaveCount(12);
		for (let index = 0; index < 12; index++) {
			await expect(eras.nth(index)).toHaveAttribute("href", /^\/music\?album=\d+$/);
		}
		// Taylor's Version Albums stand for their original's Era.
		await expect(gallery(page).getByRole("link", { name: /Fearless/ })).toHaveAttribute("href", "/music?album=221543452");
		await expect(gallery(page).getByRole("link", { name: /folklore/ })).toHaveAttribute("href", "/music?album=167766152");
		// The newest Era takes the last pressed page.
		await expect(eras.last()).toHaveAccessibleName(/Showgirl/);
		await expect(eras.last()).toHaveAttribute("href", "/music?album=1103662682");
		// Each Era is pressed with its Album cover, fetched on the server.
		await expect(gallery(page).locator("img")).toHaveCount(12);
	});

	test("the Music envelope counts every Era and Album", async ({ page }) => {
		await page.goto("/");

		await expect(waysIn(page).getByText("12 Eras, 16 Albums inside")).toBeAttached();
	});

	test("an Era's display face downloads only when its pressed page scrolls into view", async ({ page }) => {
		await page.goto("/");
		await page.evaluate(() => document.fonts.ready);
		expect(await fontLoaded(page, "Rye"), "debut face above the gallery").toBe(false);

		await gallery(page).getByRole("link").first().scrollIntoViewIfNeeded();
		await expect.poll(() => fontLoaded(page, "Rye"), { message: "debut face once its page is in view" }).toBe(true);
	});

	test("the Tour wall pins every Tour's poster, linking to its page", async ({ page }) => {
		await page.goto("/");

		for (const { tour, slug } of tours) {
			await expect(tourWall(page).getByRole("link", { name: new RegExp(tour) })).toHaveAttribute("href", `/tours/${slug}`);
		}
		await expect(tourWall(page).getByRole("link", { name: /every Tour/i })).toHaveAttribute("href", "/tours");
	});

	test("passes axe (WCAG 2.1 AA)", async ({ page }) => {
		await page.goto("/");
		await expectNoAxeViolations(page);
	});

	test("fits a 390px phone", async ({ page }) => {
		await page.setViewportSize(PHONE);
		await page.goto("/");
		await expectNoHorizontalOverflow(page);
	});

	test("is still under reduced motion", async ({ page }) => {
		await page.goto("/");
		await expectReducedMotion(page);
	});
});
