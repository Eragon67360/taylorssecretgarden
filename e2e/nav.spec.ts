import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// The nav marks the page the visitor is on, derived from the URL, so it is
// right on a direct load, after a reload and after client-side navigation.
const sections = [
	{ name: "Home", path: "/" },
	{ name: "Music", path: "/music" },
	{ name: "Tours", path: "/tours" },
	{ name: "Forum", path: "/forum" },
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
	// /forum is left out of direct loads: Swiftter falls back to the error
	// boundary until #12 rebuilds it (see routes.spec.ts).
	for (const { name, path } of sections.filter(({ path }) => path !== "/forum")) {
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

	test("the Events page is gone", async ({ request }) => {
		// Requested over HTTP rather than in the page: the browser logs a 404
		// document as a console error, which the fixture would flag.
		const response = await request.get("/events");

		expect(response.status()).toBe(404);
	});
});
