import type { Page } from "@playwright/test";

import { PHONE } from "./checks";
import { expect, test } from "./fixtures";

// The nav marks the page the visitor is on, derived from the URL, so it is
// right on a direct load, after a reload and after client-side navigation.
const sections = [
	{ name: "Home", path: "/" },
	{ name: "Music", path: "/music" },
	{ name: "Tours", path: "/tours" },
	{ name: "Swiftter", path: "/swiftter" },
];

const nav = (page: Page) => page.getByRole("navigation", { name: "Main" });

async function expectCurrent(page: Page, current: string) {
	for (const { name } of sections) {
		const link = nav(page).getByRole("link", { name, exact: true });

		if (name === current) await expect(link).toHaveAttribute("aria-current", "page");
		else await expect(link).not.toHaveAttribute("aria-current", "page");
	}
}

test.describe("Navigation", () => {
	for (const { name, path } of sections) {
		test(`a direct load of ${path} highlights ${name}`, async ({ page }) => {
			await page.goto(path);
			await expectCurrent(page, name);

			await page.reload();
			await expectCurrent(page, name);
		});
	}

	test("a Tour page highlights Tours", async ({ page }) => {
		await page.goto("/tours/the-eras-tour");
		await expectCurrent(page, "Tours");
	});

	test("navigating between sections moves the highlight", async ({ page }) => {
		await page.goto("/");
		await expectCurrent(page, "Home");

		await nav(page).getByRole("link", { name: "Music", exact: true }).click();
		await expect(page).toHaveURL("/music");
		await expectCurrent(page, "Music");

		await nav(page).getByRole("link", { name: "Home", exact: true }).click();
		await expect(page).toHaveURL("/");
		await expectCurrent(page, "Home");
	});

	test("offers only sections that exist", async ({ page }) => {
		await page.goto("/");

		await expect(nav(page).getByRole("link")).toHaveText(sections.map(({ name }) => new RegExp(`^${name}$`, "i")));
		await expect(nav(page).getByRole("link", { name: "Events" })).toHaveCount(0);
	});

	test("sits at the top of the page, above the content", async ({ page }) => {
		await page.goto("/music");
		const navBox = await nav(page).boundingBox();

		expect(navBox!.y).toBeLessThan(200);
		// The nav is part of the page flow: the page's main heading starts below it.
		const headingBox = await page.getByRole("heading", { name: "Albums", exact: true }).boundingBox();

		expect(headingBox!.y).toBeGreaterThanOrEqual(navBox!.y + navBox!.height);
	});

	test("is operable from the keyboard, with a visible focus ring", async ({ page }) => {
		await page.goto("/");
		const music = nav(page).getByRole("link", { name: "Music", exact: true });

		for (let presses = 0; presses < 6 && !(await music.evaluate((link) => link === document.activeElement)); presses++) {
			await page.keyboard.press("Tab");
		}
		await expect(music).toBeFocused();
		expect(await music.evaluate((link) => getComputedStyle(link).outlineStyle)).not.toBe("none");

		await page.keyboard.press("Enter");
		await expect(page).toHaveURL("/music");
		await expectCurrent(page, "Music");
	});

	test("fits a 390px phone with every tab easy to tap", async ({ page }) => {
		await page.setViewportSize(PHONE);
		await page.goto("/tours/the-eras-tour");

		for (const { name } of sections) {
			const link = nav(page).getByRole("link", { name, exact: true });

			await expect(link).toBeInViewport({ ratio: 1 });
			expect((await link.boundingBox())!.height, `${name} tab height`).toBeGreaterThanOrEqual(44);
		}
		await expectCurrent(page, "Tours");
	});

	test("the Events page is gone", async ({ request }) => {
		// Requested over HTTP rather than in the page: the browser logs a 404
		// document as a console error, which the fixture would flag.
		const response = await request.get("/events");

		expect(response.status()).toBe(404);
	});
});
