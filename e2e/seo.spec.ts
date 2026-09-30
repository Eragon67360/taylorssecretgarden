import type { Page } from "@playwright/test";

import tours from "../public/json/tours.json";

import { expect, test } from "./fixtures";

// What search engines and AI assistants get: robots.txt, the noindex signals,
// the sitemap, llms.txt, the JSON-LD and one h1 per page. The suite runs
// outside production (locally, in CI), where nothing may be indexed
// (lib/indexing.ts); absolute URLs are on the canonical domain.
const SITE = "https://www.taylorssecretgarden.com";
const SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9";

const TOUR_PAGES = tours.map(({ slug }) => `/tours/${slug}`);
/** Every page that may be indexed in production. */
const INDEXABLE = ["/", "/music", "/tours", ...TOUR_PAGES, "/swiftter"];
/** Pages kept out of search results everywhere. */
const NOINDEX = ["/sign-in", "/sign-up", "/styleguide"];

/** A URL as a path on the site: "https://www.taylorssecretgarden.com/music?album=1" → "/music?album=1". */
const pathOf = (url: string) => {
	const { pathname, search } = new URL(url);

	return pathname + search;
};

/** The canonical link of an HTML document, read with the browser's own parser. */
const canonicalOf = (page: Page, html: string) =>
	page.evaluate((html) => new DOMParser().parseFromString(html, "text/html").querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null, html);

test.describe("outside production", () => {
	test("robots.txt disallows everything and lists no sitemap", async ({ request }) => {
		const response = await request.get("/robots.txt");

		expect(response.status()).toBe(200);
		const lines = (await response.text())
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);

		expect(lines).toEqual(["User-Agent: *", "Disallow: /"]);
	});

	test("every response says noindex in its X-Robots-Tag header", async ({ request }) => {
		for (const path of [...INDEXABLE, ...NOINDEX, "/robots.txt", "/sitemap.xml", "/llms.txt", "/opengraph-image"]) {
			const response = await request.get(path);

			expect(response.status(), path).toBe(200);
			expect(response.headers()["x-robots-tag"], `X-Robots-Tag on ${path}`).toBe("noindex, nofollow");
		}
	});

	for (const path of ["/", "/tours"]) {
		test(`${path} says noindex, nofollow in its robots meta tag`, async ({ page }) => {
			await page.goto(path);
			await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
		});
	}
});

test.describe("sitemap.xml", () => {
	test("is a valid sitemap of every indexable page, at its canonical www URL", async ({ page, request }) => {
		const response = await request.get("/sitemap.xml");

		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("xml");

		const sitemap = await page.evaluate(
			({ xml, namespace }) => {
				const doc = new DOMParser().parseFromString(xml, "application/xml");

				return {
					error: doc.querySelector("parsererror")?.textContent ?? null,
					root: doc.documentElement.localName,
					namespace: doc.documentElement.namespaceURI,
					locs: [...doc.getElementsByTagNameNS(namespace, "loc")].map((loc) => loc.textContent?.trim() ?? ""),
				};
			},
			{ xml: await response.text(), namespace: SITEMAP_NS },
		);

		expect(sitemap.error, "XML parse error").toBeNull();
		expect(sitemap.root).toBe("urlset");
		expect(sitemap.namespace).toBe(SITEMAP_NS);
		for (const loc of sitemap.locs) expect(loc.startsWith(`${SITE}/`), loc).toBe(true);

		const paths = sitemap.locs.map(pathOf);

		expect(new Set(paths).size, "no URL listed twice").toBe(paths.length);
		expect(paths).toEqual(expect.arrayContaining(INDEXABLE));
		// Every other Album has a page of its own: a Taylor's Version, for one.
		expect(paths).toContain("/music?album=221543452");
		for (const path of [...NOINDEX, "/sign-in?redirect_url=%2Fswiftter"]) expect(paths).not.toContain(path);
	});

	test("lists each page at the address the page itself calls canonical", async ({ page, request }) => {
		const sitemap = await (await request.get("/sitemap.xml")).text();
		const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc.trim());

		expect(locs.length).toBeGreaterThan(INDEXABLE.length);
		for (const loc of locs) {
			const response = await request.get(pathOf(loc));

			expect(response.status(), loc).toBe(200);
			const canonical = await canonicalOf(page, await response.text());

			expect(canonical && new URL(canonical).href, `canonical link of ${pathOf(loc)}`).toBe(new URL(loc).href);
		}
	});
});

test.describe("llms.txt", () => {
	test("says what the site is, then its sections, Albums by Era and Tours, on the canonical domain", async ({ request }) => {
		const response = await request.get("/llms.txt");

		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("text/plain");
		const text = await response.text();

		// Answer first: the name, then a one-paragraph summary.
		expect(text).toMatch(/^# Taylor's Secret Garden\n\n> .*unofficial Taylor Swift fan site/);
		for (const heading of ["## Sections", "## Albums by Era", "## Tours"]) expect(text).toContain(`\n${heading}\n`);
		for (const [name, path] of [
			["Home", "/"],
			["Music", "/music"],
			["Tours", "/tours"],
			["Swiftter", "/swiftter"],
		]) {
			expect(text).toContain(`[${name}](${SITE}${path})`);
		}
		expect(text).toContain("### Fearless Era (2008)");
		expect(text).toContain(`[Fearless (Taylor's Version)](${SITE}/music?album=221543452)`);
		for (const { tour, slug } of tours) expect(text).toContain(`[${tour}](${SITE}/tours/${slug})`);

		const links = [...text.matchAll(/\]\((\S+?)\)/g)].map(([, url]) => url);

		for (const url of links) expect(url.startsWith(`${SITE}/`), url).toBe(true);
	});
});

test.describe("JSON-LD", () => {
	/** Every JSON-LD block on the page, parsed; each must be schema.org data with a type. */
	async function structuredData(page: Page) {
		const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();

		return blocks.map((block) => {
			const data = JSON.parse(block) as Record<string, unknown>;

			expect(data["@context"]).toBe("https://schema.org");
			expect(typeof data["@type"]).toBe("string");

			return data;
		});
	}

	test("Home describes the WebSite", async ({ page }) => {
		await page.goto("/");
		const [site, ...others] = await structuredData(page);

		expect(others).toEqual([]);
		expect(site).toMatchObject({ "@type": "WebSite", name: "Taylor's Secret Garden", url: `${SITE}/` });
	});

	test("Music describes the open Album from the catalogue", async ({ page }) => {
		await page.goto("/music");
		expect(await structuredData(page)).toEqual([
			expect.objectContaining({ "@type": "MusicAlbum", name: "Taylor Swift", datePublished: "2006-10-24", url: `${SITE}/music` }),
		]);

		await page.goto("/music?album=221543452");
		expect(await structuredData(page)).toEqual([
			expect.objectContaining({
				"@type": "MusicAlbum",
				name: "Fearless (Taylor's Version)",
				byArtist: { "@type": "Person", name: "Taylor Swift" },
				datePublished: "2021-04-09",
				url: `${SITE}/music?album=221543452`,
			}),
		]);
	});

	test("Tours lists every Tour page", async ({ page }) => {
		await page.goto("/tours");
		const [list, ...others] = await structuredData(page);

		expect(others).toEqual([]);
		expect(list["@type"]).toBe("ItemList");
		expect(list.itemListElement).toEqual(
			tours.map(({ tour, slug }, index) => ({ "@type": "ListItem", position: index + 1, name: tour, url: `${SITE}/tours/${slug}` })),
		);
	});

	for (const { tour, slug, date } of tours) {
		test(`/tours/${slug} describes ${tour} as an EventSeries, with its years only`, async ({ page }) => {
			await page.goto(`/tours/${slug}`);
			const [first, last = first] = date.split("-");

			expect(await structuredData(page)).toEqual([
				expect.objectContaining({
					"@type": "EventSeries",
					name: tour,
					url: `${SITE}/tours/${slug}`,
					startDate: first,
					endDate: last,
					performer: { "@type": "Person", name: "Taylor Swift" },
				}),
			]);
		});
	}
});

test.describe("one h1 per page", () => {
	for (const path of [...INDEXABLE, "/music?album=167766152", ...NOINDEX]) {
		test(`${path} has exactly one h1`, async ({ page }) => {
			await page.goto(path);
			await expect(page.locator("h1")).toHaveCount(1);
		});
	}
});
