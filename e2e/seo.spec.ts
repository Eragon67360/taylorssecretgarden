import type { APIRequestContext, Page } from "@playwright/test";

import { request as httpRequest } from "node:http";

import tours from "../public/json/tours.json";
import { CATALOGUE } from "../lib/catalogue";

import { expect, test } from "./fixtures";

// What search engines and AI assistants get: robots.txt, the noindex signals,
// the sitemap, llms.txt, the JSON-LD and one h1 per page. The suite runs
// outside production (locally, in CI), where nothing may be indexed
// (lib/indexing.ts); absolute URLs are on the canonical domain.
const SITE = "https://www.taylorssecretgarden.com";
const SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9";

const TOUR_PAGES = tours.map(({ slug }) => `/tours/${slug}`);
/** Every page that may be indexed in production. */
const INDEXABLE = ["/", "/music", "/tours", ...TOUR_PAGES, "/swiftter", "/terms", "/privacy", "/legal"];
/** A seeded Swiftter thread (scripts/seed-data.ts): a page of its own, not indexed (seed content). */
const SEEDED_THREAD = "/swiftter/p/5eed0000-0000-4000-8000-000000000001";
/** Pages kept out of search results everywhere. */
const NOINDEX = ["/sign-in", "/sign-up", "/styleguide"];

/** A URL as a path on the site: "https://www.taylorssecretgarden.com/music?album=1" → "/music?album=1". */
const pathOf = (url: string) => {
  const { pathname, search } = new URL(url);

  return pathname + search;
};

/*
  Most checks read the HTML the server sends, as a crawler does, parsed by the
  browser's own parser on a blank page. No page scripts run, so they add no
  session requests to Neon Auth (which rate-limits CI's branch).
*/

/** A page's HTML as the server sends it (asserting it answers 200). */
async function htmlOf(request: APIRequestContext, path: string) {
  const response = await request.get(path);

  expect(response.status(), path).toBe(200);

  return response.text();
}

/** The first element matching `selector` in an HTML document: one of its attributes. */
const attributeIn = (page: Page, html: string, selector: string, attribute: string) =>
  page.evaluate(
    ({ html, selector, attribute }) => new DOMParser().parseFromString(html, "text/html").querySelector(selector)?.getAttribute(attribute) ?? null,
    { html, selector, attribute },
  );

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
    test(`${path} says noindex, nofollow in its robots meta tag`, async ({ page, request }) => {
      expect(await attributeIn(page, await htmlOf(request, path), 'meta[name="robots"]', "content")).toBe("noindex, nofollow");
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

  test("lists Swiftter threads, never seed or demo ones", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    const threads = [...sitemap.matchAll(/<loc>[^<]*\/swiftter\/p\/([^<]+)<\/loc>/g)].map(([, id]) => id);

    for (const id of threads) expect(id, "a thread's id").toMatch(/^[0-9a-f-]{36}$/);
    // Development fixtures (scripts/seed-data.ts) and the demo Posts (db/seed.ts) are never listed.
    expect(threads.filter((id) => id.startsWith("5eed0000-") || id.startsWith("5d1c0a3e-"))).toEqual([]);
  });

  test("every link to Music on Home, Music and the Tour pages is a sitemap URL or a Version's own page", async ({ page, request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    const listed = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => pathOf(loc.trim())));
    const versionPages = new Set(CATALOGUE.flatMap((album) => album.versions ?? []).map(({ id }) => `/music?album=${id}`));
    const pages = ["/", ...[...listed].filter((path) => path.startsWith("/music") || path.startsWith("/tours/"))];
    let checked = 0;

    for (const path of pages) {
      const hrefs = await page.evaluate(
        (html) => [...new DOMParser().parseFromString(html, "text/html").querySelectorAll("a[href^='/music']")].map((link) => link.getAttribute("href")!),
        await htmlOf(request, path),
      );

      for (const href of hrefs) expect(listed.has(href) || versionPages.has(href), `${href}, linked from ${path}`).toBe(true);
      checked += hrefs.length;
    }
    // The shelf alone links all 16 Albums, on each of Music's pages.
    expect(checked).toBeGreaterThan(16 * 16);
  });

  test("lists each page at the address the page itself calls canonical", async ({ page, request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc.trim());

    expect(locs.length).toBeGreaterThan(INDEXABLE.length);
    for (const loc of locs) {
      const canonical = await attributeIn(page, await htmlOf(request, pathOf(loc)), 'link[rel="canonical"]', "href");

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

  test("gives each Album's song count, running time and label, as its page does", async ({ request }) => {
    const text = await (await request.get("/llms.txt")).text();

    expect(text).toMatch(
      new RegExp(`^- \\[reputation\\]\\(${RegExp.escape(SITE)}/music\\?album=52612062\\): released November 10, 2017; 15 songs, \\d+ min, label .+\\.$`, "m"),
    );
    expect(text).toMatch(/^- \[Midnights\]\(.+\): released October 21, 2022; 23 songs, 1 h \d{2} min, label /m);
  });

  test("/llms-full.txt lists every Album's tracklist", async ({ request }) => {
    const response = await request.get("/llms-full.txt");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");
    const text = await response.text();

    expect(text).toMatch(/^# Taylor's Secret Garden: every tracklist\n/);
    expect(text).toContain(`## reputation\n\n${SITE}/music?album=52612062\n`);
    expect(text).toContain("\n1. ...Ready For It? (3:28)\n");
    expect(text.match(/^## /gm)).toHaveLength(CATALOGUE.length);
  });
});

test.describe("JSON-LD", () => {
  /** Every JSON-LD block in a page's HTML, parsed; each must be schema.org data with a type. */
  async function structuredData(page: Page, request: APIRequestContext, path: string) {
    const blocks = await page.evaluate(
      (html) =>
        [...new DOMParser().parseFromString(html, "text/html").querySelectorAll('script[type="application/ld+json"]')].map(
          (script) => script.textContent ?? "",
        ),
      await htmlOf(request, path),
    );

    return blocks.map((block) => {
      const data = JSON.parse(block) as Record<string, unknown>;

      expect(data["@context"]).toBe("https://schema.org");
      expect(typeof data["@type"]).toBe("string");

      return data;
    });
  }

  test("Home describes the WebSite", async ({ page, request }) => {
    const [site, ...others] = await structuredData(page, request, "/");

    expect(others).toEqual([]);
    expect(site).toMatchObject({ "@type": "WebSite", name: "Taylor's Secret Garden", url: `${SITE}/` });
  });

  /** Taylor Swift, tied to her Wikipedia and Wikidata entries and official site. */
  const TAYLOR_SWIFT = expect.objectContaining({
    "@type": "MusicGroup",
    name: "Taylor Swift",
    sameAs: expect.arrayContaining(["https://en.wikipedia.org/wiki/Taylor_Swift", "https://www.wikidata.org/wiki/Q26876"]),
  });
  const ISO_DURATION = /^PT(\d+H)?(\d+M)?(\d+S)?$/;

  /** A MusicAlbum's tracks: an ItemList of MusicRecordings, each with an ISO 8601 duration. */
  function expectTracks(album: Record<string, unknown>) {
    const track = album.track as {
      "@type": string;
      numberOfItems: number;
      itemListElement: { "@type": string; position: number; item: Record<string, unknown> }[];
    };

    expect(track["@type"]).toBe("ItemList");
    expect(track.numberOfItems).toBe(album.numTracks);
    expect(track.itemListElement).toHaveLength(album.numTracks as number);
    for (const [index, { position, item }] of track.itemListElement.entries()) {
      expect(position).toBe(index + 1);
      expect(item).toMatchObject({ "@type": "MusicRecording", name: expect.any(String), duration: expect.stringMatching(ISO_DURATION) });
    }
  }

  test("Music describes the open Album from the catalogue, with its tracks and label", async ({ page, request }) => {
    const [debut, ...others] = await structuredData(page, request, "/music");

    expect(others).toEqual([]);
    expect(debut).toMatchObject({ "@type": "MusicAlbum", name: "Taylor Swift", datePublished: "2006-10-24", url: `${SITE}/music`, byArtist: TAYLOR_SWIFT });

    const [album] = await structuredData(page, request, "/music?album=221543452");

    expect(album).toMatchObject({
      "@type": "MusicAlbum",
      name: "Fearless (Taylor's Version)",
      byArtist: TAYLOR_SWIFT,
      datePublished: "2021-04-09",
      url: `${SITE}/music?album=221543452`,
      image: expect.stringMatching(/^https:\/\//),
      albumProductionType: "https://schema.org/StudioAlbum",
      albumReleaseType: "https://schema.org/AlbumRelease",
      // A Taylor's Version is based on its original.
      isBasedOn: { "@type": "MusicAlbum", name: "Fearless", url: `${SITE}/music?album=426350` },
      albumRelease: {
        "@type": "MusicRelease",
        recordLabel: { "@type": "Organization", name: expect.any(String) },
        releaseOf: expect.objectContaining({ "@type": "MusicAlbum", url: `${SITE}/music?album=221543452` }),
      },
    });
    expect(album.numTracks).toBeGreaterThanOrEqual(26);
    expectTracks(album);
  });

  test("a Version's page describes the Version itself, as a release of its Album", async ({ page, request }) => {
    const [version] = await structuredData(page, request, "/music?album=188803732");

    expect(version).toMatchObject({
      "@type": "MusicAlbum",
      name: "folklore, The Long Pond Studio Sessions",
      datePublished: "2020-11-25",
      url: `${SITE}/music?album=188803732`,
      albumProductionType: "https://schema.org/LiveAlbum",
      albumRelease: { "@type": "MusicRelease", releaseOf: expect.objectContaining({ name: "folklore", url: `${SITE}/music?album=167766152` }) },
    });
    expectTracks(version);

    const [chapter] = await structuredData(page, request, "/music?album=289970772");

    expect(chapter).toMatchObject({ name: "Red (Taylor's Version), From The Vault Chapter", albumProductionType: "https://schema.org/CompilationAlbum" });
  });

  test("Tours lists every Tour page", async ({ page, request }) => {
    const [list, ...others] = await structuredData(page, request, "/tours");

    expect(others).toEqual([]);
    expect(list["@type"]).toBe("ItemList");
    expect(list.itemListElement).toEqual(
      tours.map(({ tour, slug }, index) => ({ "@type": "ListItem", position: index + 1, name: tour, url: `${SITE}/tours/${slug}` })),
    );
  });

  for (const { tour, slug, date } of tours) {
    test(`/tours/${slug} describes ${tour} as an EventSeries, with its years only`, async ({ page, request }) => {
      const [first, last = first] = date.split("-");

      expect(await structuredData(page, request, `/tours/${slug}`)).toEqual([
        expect.objectContaining({
          "@type": "EventSeries",
          name: tour,
          url: `${SITE}/tours/${slug}`,
          startDate: first,
          endDate: last,
          performer: expect.objectContaining({ "@type": "MusicGroup", name: "Taylor Swift" }),
        }),
      ]);
    });
  }
});

test.describe("metadata crawlers read in the <head>", () => {
  // A thread's metadata awaits the database: Next would stream it into the
  // body for any user agent outside next.config.ts's htmlLimitedBots.
  const CRAWLERS = {
    Googlebot:
      "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    GPTBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot",
    ClaudeBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
    PerplexityBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
  };

  for (const [name, userAgent] of Object.entries(CRAWLERS)) {
    test(`${name} gets a thread's canonical link and robots tag before </head>`, async ({ request }) => {
      const response = await request.get(SEEDED_THREAD, { headers: { "User-Agent": userAgent } });

      expect(response.status()).toBe(200);
      const html = await response.text();
      const head = html.slice(0, html.indexOf("</head>"));

      expect(html.indexOf("</head>")).toBeGreaterThan(0);
      expect(head).toContain(`<link rel="canonical" href="${SITE}${SEEDED_THREAD}"/>`);
      expect(head).toContain('<meta name="robots" content="noindex, nofollow"/>');
    });
  }
});

test.describe("links between clusters", () => {
  /** Every link in a page's HTML: its href and text. */
  const linksOf = async (page: Page, request: APIRequestContext, path: string) =>
    page.evaluate(
      (html) =>
        [...new DOMParser().parseFromString(html, "text/html").querySelectorAll("main a[href]")].map((link) => ({
          href: link.getAttribute("href"),
          text: link.textContent?.replace(/\s+/g, " ").trim(),
        })),
      await htmlOf(request, path),
    );

  test("a Tour page links its Era's Albums, named, at their canonical addresses", async ({ page, request }) => {
    expect(await linksOf(page, request, "/tours/the-red-tour")).toEqual(
      expect.arrayContaining([
        { href: "/music?album=68491961", text: "Red tracklist · 2012" },
        { href: "/music?album=272247412", text: "Red (Taylor's Version) tracklist · 2021" },
      ]),
    );
    // The Eras Tour spans every Era: it links the Music shelf.
    expect(await linksOf(page, request, "/tours/the-eras-tour")).toEqual(
      expect.arrayContaining([{ href: "/music", text: "Taylor Swift's Albums, on the Music shelf" }]),
    );
  });

  test("a Taylor's Version links its original and back, and each Album its Era's Tour", async ({ page, request }) => {
    const taylorsVersion = await linksOf(page, request, "/music?album=221543452");

    expect(taylorsVersion).toEqual(
      expect.arrayContaining([
        { href: "/music?album=426350", text: "Fearless (2008)" },
        { href: "/tours/fearless-tour", text: "Fearless Tour (2009–2010)" },
      ]),
    );
    expect(await linksOf(page, request, "/music?album=426350")).toEqual(
      expect.arrayContaining([{ href: "/music?album=221543452", text: "Fearless (Taylor's Version)" }]),
    );
  });
});

// In the browser, once the page has run: an h1 rendered on the client counts too.
test.describe("one h1 per page", () => {
  test.beforeEach(async ({ page }) => {
    // Nobody signs in here: the header's "is anyone signed in?" request is
    // answered locally, so these page loads add nothing to Neon Auth's
    // request count on CI's branch (it rate-limits, and a 429 is a console error).
    await page.route(/\/api\/auth\/get-session(\?|$)/, (route) => route.fulfill({ json: null }));
  });

  for (const path of [...INDEXABLE, "/music?album=167766152", ...NOINDEX, SEEDED_THREAD]) {
    test(`${path} has exactly one h1`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
    });
  }
});

test.describe("the old production address", () => {
  /** Status and Location of a request to this server as if sent to `host` (browsers can't set Host; Node can). */
  const asHost = (baseURL: string, host: string, path: string) =>
    new Promise<{ status: number; location: string | undefined }>((resolve, reject) => {
      const { hostname, port } = new URL(baseURL);

      httpRequest({ hostname, port, path, headers: { host } }, (response) => {
        response.resume();
        resolve({ status: response.statusCode ?? 0, location: response.headers.location });
      })
        .on("error", reject)
        .end();
    });

  test("taylorssecretgarden.vercel.app pages move permanently to www, path and query kept", async ({ baseURL }) => {
    for (const path of ["/", "/music?album=52612062", "/swiftter/p/5eed0000-0000-4000-8000-000000000001"]) {
      expect(await asHost(baseURL!, "taylorssecretgarden.vercel.app", path), path).toEqual({ status: 308, location: `${SITE}${path}` });
    }
  });

  test("its API routes keep answering (cron, tabs left open), and other hosts are not redirected", async ({ baseURL }) => {
    expect((await asHost(baseURL!, "taylorssecretgarden.vercel.app", "/api/swiftter/posts")).status).toBe(200);
    expect((await asHost(baseURL!, "taylorssecretgarden.vercel.app", "/api/cron/moderation")).status).toBe(401);
    expect((await asHost(baseURL!, "taylorssecretgarden-git-dev-le-bon-temperament.vercel.app", "/music")).status).toBe(200);
  });
});
