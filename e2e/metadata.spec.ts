import type { Page } from "@playwright/test";

import tours from "../public/json/tours.json";

import { expect, test } from "./fixtures";

// What a browser tab, a home screen and a link preview show: the title and
// description, the pressed-flower icons and the Open Graph card.

/** A tag's URL attribute, as a path on this server (metadata URLs are absolute, on the production host). */
async function pathOf(page: Page, selector: string, attribute: "href" | "content") {
	const value = await page.locator(selector).getAttribute(attribute);

	expect(value, `${selector} ${attribute}`).toBeTruthy();
	const { pathname, search } = new URL(value!, page.url());

	return pathname + search;
}

test.describe("site metadata", () => {
	test("names and describes Taylor's Secret Garden", async ({ page }) => {
		await page.goto("/");

		await expect(page).toHaveTitle(/^Taylor's Secret Garden/);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /scrapbook of every Taylor Swift Era/);

		await page.goto("/music");
		await expect(page).toHaveTitle("Music · Taylor's Secret Garden");
	});

	test("links an icon and a home-screen icon that load", async ({ page, request }) => {
		await page.goto("/");

		const icon = await request.get(await pathOf(page, 'link[rel="icon"]', "href"));

		expect(icon.status()).toBe(200);
		expect(icon.headers()["content-type"]).toContain("image/svg+xml");

		const appleIcon = await request.get(await pathOf(page, 'link[rel="apple-touch-icon"]', "href"));

		expect(appleIcon.status()).toBe(200);
		expect(appleIcon.headers()["content-type"]).toBe("image/png");
	});

	test("has an Open Graph card and a large X card", async ({ page, request }) => {
		await page.goto("/tours");

		await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /Taylor's Secret Garden/);
		await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");

		const card = await request.get(await pathOf(page, 'meta[property="og:image"]', "content"));

		expect(card.status()).toBe(200);
		expect(card.headers()["content-type"]).toBe("image/png");
		expect((await card.body()).length).toBeGreaterThan(10_000);
	});
});

// Every route names its canonical address on www.taylorssecretgarden.com, and
// has its own title, description, Open Graph card and X card.
const SITE = "https://www.taylorssecretgarden.com";

const canonicalPages = [
	{ path: "/", canonical: "/", title: /^Taylor's Secret Garden: a Swiftie's scrapbook$/ },
	{ path: "/music", canonical: "/music", title: "Music · Taylor's Secret Garden" },
	// An Album's own page; a regional twin or another ID of it points there.
	{ path: "/music?album=221543452", canonical: "/music?album=221543452", title: "Fearless (Taylor's Version) tracklist · Taylor's Secret Garden" },
	{ path: "/music?album=272284", canonical: "/music?album=426350", title: "Fearless tracklist · Taylor's Secret Garden" },
	// The first Album is the one /music opens on.
	{ path: "/music?album=81389452", canonical: "/music", title: "Music · Taylor's Secret Garden" },
	// A Version (its own tracklist) is its own page.
	{ path: "/music?album=188803732", canonical: "/music?album=188803732", title: "folklore, The Long Pond Studio Sessions tracklist · Taylor's Secret Garden" },
	{ path: "/tours", canonical: "/tours", title: "Tours · Taylor's Secret Garden" },
	...tours.map(({ slug, tour }) => ({ path: `/tours/${slug}`, canonical: `/tours/${slug}`, title: `${tour} · Taylor's Secret Garden` })),
	{ path: "/swiftter", canonical: "/swiftter", title: "Swiftter · Taylor's Secret Garden" },
	{ path: "/sign-in?redirect_url=%2Fswiftter", canonical: "/sign-in", title: "Sign in · Taylor's Secret Garden" },
	{ path: "/sign-up", canonical: "/sign-up", title: "Sign up · Taylor's Secret Garden" },
];

test.describe("per-route metadata", () => {
	for (const { path, canonical, title } of canonicalPages) {
		test(`${path}: canonical ${canonical}, title, description, Open Graph and X cards`, async ({ page }) => {
			await page.goto(path);
			const url = new URL(canonical, SITE).href;
			const content = (selector: string) => page.locator(selector).getAttribute("content");

			await expect(page).toHaveTitle(title);
			expect(new URL((await page.locator('link[rel="canonical"]').getAttribute("href"))!).href).toBe(url);
			expect(new URL((await content('meta[property="og:url"]'))!).href).toBe(url);
			expect(await content('meta[name="description"]')).toBeTruthy();
			expect(await content('meta[property="og:title"]')).toBe(await page.title());
			expect(await content('meta[property="og:description"]')).toBe(await content('meta[name="description"]'));
			expect(await content('meta[property="og:site_name"]')).toBe("Taylor's Secret Garden");
			expect(new URL((await content('meta[property="og:image"]'))!).origin).toBe(SITE);
			expect(await content('meta[name="twitter:card"]')).toBe("summary_large_image");
			expect(await content('meta[name="twitter:image"]')).toBe(await content('meta[property="og:image"]'));
		});
	}

	test("the guestbook pages are noindex", async ({ page }) => {
		for (const path of ["/sign-in", "/sign-up"]) {
			await page.goto(path);
			await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
		}
	});
});
