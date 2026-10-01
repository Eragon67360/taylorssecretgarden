import type { APIRequestContext, Page } from "@playwright/test";

import tours from "../public/json/tours.json";
import { seedId } from "../scripts/seed-data";

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
    await expect(page).toHaveTitle("Taylor Swift's Albums and tracklists · Taylor's Secret Garden");
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
// has its own title, description, Open Graph card and X card. Read from the
// HTML the server sends, as a crawler reads it, without loading the page in the
// browser: no page scripts run, so these checks add no session requests to
// Neon Auth (which rate-limits CI's branch).
const SITE = "https://www.taylorssecretgarden.com";

/** A page's metadata as the server sends it, parsed by the browser's own HTML parser. */
async function metadataOf(page: Page, request: APIRequestContext, path: string) {
  const response = await request.get(path);

  expect(response.status(), path).toBe(200);

  return page.evaluate(
    (html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const meta = (key: string) => doc.querySelector(`meta[name="${key}"], meta[property="${key}"]`)?.getAttribute("content") ?? null;

      return {
        title: doc.title,
        canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
        description: meta("description"),
        robots: meta("robots"),
        ogUrl: meta("og:url"),
        ogTitle: meta("og:title"),
        ogDescription: meta("og:description"),
        ogSiteName: meta("og:site_name"),
        ogImage: meta("og:image"),
        twitterCard: meta("twitter:card"),
        twitterImage: meta("twitter:image"),
      };
    },
    await response.text(),
  );
}

/** A seeded Swiftter thread (scripts/seed-data.ts), loaded on every test branch. */
const SEEDED_THREAD = seedId("p", 1);

const canonicalPages = [
  { path: "/", canonical: "/", title: "Taylor's Secret Garden: a Taylor Swift fan scrapbook" },
  { path: "/music", canonical: "/music", title: "Taylor Swift's Albums and tracklists · Taylor's Secret Garden" },
  // An Album's own page; an old link by a regional twin or another ID of it is sent there.
  {
    path: "/music/fearless-taylors-version",
    canonical: "/music/fearless-taylors-version",
    title: "Fearless (Taylor's Version) tracklist · Taylor's Secret Garden",
  },
  { path: "/music?album=272284", canonical: "/music/fearless", title: "Fearless tracklist (Taylor Swift) · Taylor's Secret Garden" },
  // The first Album is the one /music opens on.
  { path: "/music?album=81389452", canonical: "/music", title: "Taylor Swift's Albums and tracklists · Taylor's Secret Garden" },
  // A Version (its own tracklist) is its own page, the first Album's included.
  {
    path: "/music/folklore/the-long-pond-studio-sessions",
    canonical: "/music/folklore/the-long-pond-studio-sessions",
    title: "folklore, The Long Pond Studio Sessions tracklist (Taylor Swift) · Taylor's Secret Garden",
  },
  {
    path: "/music/taylor-swift/standard-edition",
    canonical: "/music/taylor-swift/standard-edition",
    title: "Taylor Swift, Standard Edition tracklist (Taylor Swift) · Taylor's Secret Garden",
  },
  { path: "/tours", canonical: "/tours", title: "Taylor Swift's Tours · Taylor's Secret Garden" },
  ...tours.map(({ slug, tour, date }) => ({
    path: `/tours/${slug}`,
    canonical: `/tours/${slug}`,
    title: `${tour}: Taylor Swift's ${date.replace("-", "–")} tour · Taylor's Secret Garden`,
  })),
  { path: "/swiftter", canonical: "/swiftter", title: "Swiftter · Taylor's Secret Garden" },
  { path: "/terms", canonical: "/terms", title: "Terms and community rules · Taylor's Secret Garden" },
  { path: "/privacy", canonical: "/privacy", title: "Privacy policy · Taylor's Secret Garden" },
  { path: "/legal", canonical: "/legal", title: "Legal notice (mentions légales) · Taylor's Secret Garden" },
  // A thread (seeded, scripts/seed-data.ts): the site's card and name, its title under the layout's template.
  { path: `/swiftter/p/${SEEDED_THREAD}`, canonical: `/swiftter/p/${SEEDED_THREAD}`, title: "Wren Holloway's note on Swiftter · Taylor's Secret Garden" },
  { path: "/sign-in?redirect_url=%2Fswiftter", canonical: "/sign-in", title: "Sign in · Taylor's Secret Garden" },
  { path: "/sign-up", canonical: "/sign-up", title: "Sign up · Taylor's Secret Garden" },
];

test.describe("per-route metadata", () => {
  for (const { path, canonical, title } of canonicalPages) {
    test(`${path}: canonical ${canonical}, title, description, Open Graph and X cards`, async ({ page, request }) => {
      const metadata = await metadataOf(page, request, path);
      const url = new URL(canonical, SITE).href;

      expect(metadata.title).toBe(title);
      expect(metadata.canonical && new URL(metadata.canonical).href, "canonical link").toBe(url);
      expect(metadata.ogUrl && new URL(metadata.ogUrl).href, "og:url").toBe(url);
      expect(metadata.description).toBeTruthy();
      expect(metadata.ogTitle).toBe(metadata.title);
      expect(metadata.ogDescription).toBe(metadata.description);
      expect(metadata.ogSiteName).toBe("Taylor's Secret Garden");
      expect(metadata.ogImage && new URL(metadata.ogImage).origin, "og:image").toBe(SITE);
      expect(metadata.twitterCard).toBe("summary_large_image");
      expect(metadata.twitterImage).toBe(metadata.ogImage);
    });
  }

  test("Music and Tour descriptions answer first, in a search snippet's length", async ({ page, request }) => {
    const describe = async (path: string) => (await metadataOf(page, request, path)).description ?? "";

    // /music opens on the debut, and says so.
    expect(await describe("/music")).toMatch(/^Taylor Swift's 16 Albums in Era order, opening on her debut, Taylor Swift \(October 24, 2006\)/);
    expect(await describe("/music/fearless-taylors-version")).toMatch(
      /^Fearless \(Taylor's Version\), Taylor Swift's re-recording of Fearless, released April 9, 2021/,
    );
    for (const { slug, tour, shows } of tours) {
      const description = await describe(`/tours/${slug}`);

      expect(description, slug).toMatch(new RegExp(`^${tour}, Taylor Swift's \\d{4}(–\\d{4})? tour .*: ${shows} shows in `));
      expect(description.length, slug).toBeLessThanOrEqual(160);
    }
    for (const path of ["/", "/music", "/music/fearless", "/music/folklore/the-long-pond-studio-sessions", "/tours"])
      expect((await describe(path)).length, path).toBeLessThanOrEqual(165);
  });

  test("a thread's card is an article's, with when it was published", async ({ request }) => {
    const html = await (await request.get(`/swiftter/p/${SEEDED_THREAD}`)).text();

    expect(html).toContain('<meta property="og:type" content="article"/>');
    expect(html).toMatch(/<meta property="article:published_time" content="\d{4}-\d{2}-\d{2}T/);
  });

  test("the guestbook pages are noindex", async ({ page, request }) => {
    for (const path of ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"]) {
      expect((await metadataOf(page, request, path)).robots, path).toMatch(/noindex/);
    }
  });
});
