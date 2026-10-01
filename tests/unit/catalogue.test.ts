import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/albums/route";
import { getShelf, getVersions, type ShelfAlbum } from "@/components/music/catalogue";
import { selectRelease } from "@/components/music/selection";
import { CATALOGUE, albumName, albumPath, findAlbum, findRelease, isTaylorsVersion, pathOfDeezerId, versionPath } from "@/lib/catalogue";

import { cacheStats, resetCache } from "../stubs/next-cache";

import { album, cover, fakeDeezer, noData } from "./fake-deezer";

vi.mock("next/cache", () => import("../stubs/next-cache"));

let deezer: ReturnType<typeof fakeDeezer>;

// Fearless (426350) as Deezer's US catalogue answers it: under its regional twin's ID.
const FEARLESS = "426350";
const FEARLESS_TWIN = "272284";
const FEARLESS_TV = "221543452";

beforeEach(() => {
  resetCache();
  deezer = fakeDeezer();
  deezer.answer(`/album/${FEARLESS}`, { body: album(FEARLESS_TWIN) });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const byCatalogueId = (shelf: ShelfAlbum[], id: string) => shelf.find(({ catalogueId }) => catalogueId === id)!;

describe("getShelf", () => {
  it("puts every catalogue Album on the shelf, in order, with its cover and the ID Deezer answered", async () => {
    const shelf = await getShelf();

    expect(shelf.map(({ catalogueId }) => catalogueId)).toEqual(CATALOGUE.map(({ id }) => id));
    expect(byCatalogueId(shelf, FEARLESS)).toMatchObject({ id: FEARLESS_TWIN, name: "Fearless", images: [{ url: cover(FEARLESS_TWIN) }] });
    // A Taylor's Version points at the ID its original is on the shelf under.
    expect(byCatalogueId(shelf, FEARLESS_TV)).toMatchObject({ name: "Fearless (Taylor's Version)", taylorsVersion: true, reRecords: FEARLESS_TWIN });
  });

  it("reads the cache once for the whole shelf once it is warm", async () => {
    await getShelf();
    const fetched = deezer.calls.length;

    cacheStats.reads = 0;
    await getShelf();
    expect(cacheStats.reads).toBe(1);
    expect(deezer.calls).toHaveLength(fetched);
  });

  it("keeps an Album Deezer fails on the shelf, under its catalogue ID and without a cover, and caches nothing", async () => {
    deezer.answer(`/album/${FEARLESS}`, noData);

    const shelf = await getShelf();

    expect(shelf).toHaveLength(CATALOGUE.length);
    expect(byCatalogueId(shelf, FEARLESS)).toMatchObject({ id: FEARLESS, name: "Fearless", images: [] });
    // Still linked by its canonical page, like every Album.
    expect(shelf.map(({ path }) => path)).toEqual(CATALOGUE.map((entry) => albumPath(entry)));
    expect(byCatalogueId(shelf, FEARLESS_TV)).toMatchObject({ reRecords: FEARLESS, images: [{ url: cover(FEARLESS_TV) }] });

    // Not cached half-empty: once Deezer is back, the next render has every cover.
    deezer.answer(`/album/${FEARLESS}`, { body: album(FEARLESS_TWIN) });
    expect((await getShelf()).every(({ images }) => images.length === 1)).toBe(true);
  });

  it("still renders every Album when Deezer hangs", async () => {
    vi.spyOn(AbortSignal, "timeout").mockImplementation(() => AbortSignal.abort(new DOMException("The operation timed out.", "TimeoutError")));
    for (const { id } of CATALOGUE) deezer.answer(`/album/${id}`, "hang");

    const shelf = await getShelf();

    expect(shelf.map(({ id }) => id)).toEqual(CATALOGUE.map(({ id }) => id));
    expect(shelf.every(({ images }) => images.length === 0)).toBe(true);
  });
});

describe("getVersions", () => {
  it("lists the shelf's edition first, then every version with its cover, cached as one entry", async () => {
    const shelf = await getShelf();
    const fearless = byCatalogueId(shelf, FEARLESS);
    const versions = await getVersions(fearless);

    expect(versions.map(({ id, name }) => [id, name])).toEqual([
      [FEARLESS_TWIN, "Platinum Edition"],
      ["130714702", "Standard Edition"],
      ["283925", "International Version"],
      ["142920532", "Live From Clear Channel Stripped 2008"],
    ]);
    expect(versions[1].cover).toBe(cover("130714702"));
    expect(versions[0].path).toBe(fearless.path);
    expect(new Set(versions.map(({ path }) => path)).size).toBe(versions.length);

    cacheStats.reads = 0;
    expect(await getVersions(fearless)).toEqual(versions);
    expect(cacheStats.reads).toBe(1);
  });

  it("is empty for an Album with only the one version", async () => {
    const reputation = byCatalogueId(await getShelf(), "52612062");

    expect(await getVersions(reputation)).toEqual([]);
  });

  it("is empty when Deezer fails a version, and caches nothing", async () => {
    const fearless = byCatalogueId(await getShelf(), FEARLESS);

    deezer.answer("/album/283925", noData);
    expect(await getVersions(fearless)).toEqual([]);

    deezer.answer("/album/283925", { body: album("283925") });
    expect(await getVersions(fearless)).toHaveLength(4);
  });

  it("is empty when the shelf has no cover for the Album", async () => {
    deezer.answer(`/album/${FEARLESS}`, noData);
    const fearless = byCatalogueId(await getShelf(), FEARLESS);

    expect(await getVersions(fearless)).toEqual([]);
  });
});

describe("GET /api/albums", () => {
  it("answers the catalogue, cacheable by the CDN", async () => {
    const response = await GET();
    const { items } = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, s-maxage=3600, stale-while-revalidate=86400");
    expect(items).toHaveLength(CATALOGUE.length);
    expect(items[1]).toMatchObject({ id: FEARLESS_TWIN, name: "Fearless", era: "fearless", year: 2008 });
  });

  it("answers 502 with a JSON error, never cached, while Deezer fails", async () => {
    deezer.answer("/album/52612062", { status: 500, body: {} });

    const response = await GET();

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Deezer is unavailable, try again shortly." });
  });
});

/*
  Resolving a Music address: the shelf holds each catalogue Album under the
  ID Deezer answered, so here Fearless is on it under its twin's ID.
*/
describe("findAlbum, pathOfDeezerId and selectRelease", () => {
  const shelf: ShelfAlbum[] = CATALOGUE.map((entry) => ({
    id: entry.id === FEARLESS ? FEARLESS_TWIN : entry.id,
    catalogueId: entry.id,
    path: albumPath(entry),
    name: entry.title,
    images: [],
    era: entry.era,
    title: entry.title,
    edition: entry.edition ?? null,
    year: 0,
    released: entry.released,
    taylorsVersion: !!entry.reRecords,
    reRecords: entry.reRecords ?? null,
  }));

  it.each([
    ["the Album's own ID", "227786", "227786"],
    ["a version's ID", "874936972", "227786"],
    ["an alias (a regional twin)", "81389452", "227786"],
    ["the US Standard Edition", "130714702", FEARLESS],
    ["the twin Deezer answers with", FEARLESS_TWIN, FEARLESS],
    ["another twin", "130714712", FEARLESS],
    ["a Taylor's Version's version", "418639447", FEARLESS_TV],
    ["an alias of Midnights", "368474237", "446218925"],
  ])("findAlbum finds the Album by %s", (_, id, catalogueId) => {
    expect(findAlbum(id)?.id).toBe(catalogueId);
  });

  it.each([
    ["nothing", undefined],
    ["an unknown ID", "1"],
    ["an ignored release", "1211619"],
  ])("findAlbum finds no Album for %s", (_, id) => {
    expect(findAlbum(id)).toBeUndefined();
  });

  // Where each old /music?album=<id> link is sent (proxy.ts).
  it.each([
    ["the first Album's ID", "227786", "/music"],
    ["the first Album's alias", "81389452", "/music"],
    ["the first Album's Version", "874936972", "/music/taylor-swift/standard-edition"],
    ["the catalogue's ID", FEARLESS, "/music/fearless"],
    ["the twin Deezer answers with", FEARLESS_TWIN, "/music/fearless"],
    ["another twin", "81389432", "/music/fearless"],
    ["a Version", "283925", "/music/fearless/international-version"],
    ["a Taylor's Version", FEARLESS_TV, "/music/fearless-taylors-version"],
    ["a Chapter of Red (Taylor's Version)", "289970772", "/music/red-taylors-version/from-the-vault-chapter"],
    ["a Version of folklore", "188803732", "/music/folklore/the-long-pond-studio-sessions"],
    ["an alias of Midnights", "368474237", "/music/midnights"],
  ])("pathOfDeezerId sends %s to its page", (_, id, path) => {
    expect(pathOfDeezerId(id)).toBe(path);
  });

  it.each([
    ["nothing", undefined],
    ["an unknown ID", "1"],
    ["an ignored release", "1211619"],
  ])("pathOfDeezerId has no page for %s", (_, id) => {
    expect(pathOfDeezerId(id)).toBeUndefined();
  });

  it.each([
    ["/music: the first Album", [], "227786", "227786"],
    ["an Album: on the ID on the shelf", ["fearless"], FEARLESS, FEARLESS_TWIN],
    ["a Version", ["fearless", "international-version"], FEARLESS, "283925"],
    ["the US Standard Edition", ["fearless", "standard-edition"], FEARLESS, "130714702"],
    ["the first Album's Version", ["taylor-swift", "standard-edition"], "227786", "874936972"],
    ["a Taylor's Version", ["fearless-taylors-version"], FEARLESS_TV, FEARLESS_TV],
    ["a Chapter of Red (Taylor's Version)", ["red-taylors-version", "from-the-vault-chapter"], "272247412", "289970772"],
  ])("selectRelease opens %s", (_, slugs, catalogueId, versionId) => {
    const selected = selectRelease(shelf, slugs);

    expect(selected?.album.catalogueId).toBe(catalogueId);
    expect(selected?.albumId).toBe(byCatalogueId(shelf, catalogueId).id);
    expect(selected?.versionId).toBe(versionId);
  });

  it.each([
    ["an unknown Album", ["fearless-deluxe"]],
    ["an unknown Version", ["fearless", "3am-edition"]],
    ["another Album's Version", ["reputation", "standard-edition"]],
  ])("selectRelease opens nothing for %s", (_, slugs) => {
    expect(selectRelease(shelf, slugs)).toBeUndefined();
  });

  it("selectRelease opens nothing on an empty shelf", () => {
    expect(selectRelease([], [])).toBeUndefined();
  });
});

/*
  The slugs are the Music addresses (lib/catalogue.ts): readable, safe in a
  URL, one page each, and every Deezer ID an old link may carry (an Album's,
  a Version's, an alias or a regional twin) still finds its page.
*/
describe("the catalogue's slugs", () => {
  const URL_SAFE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  it("are lowercase words joined by hyphens", () => {
    for (const album of CATALOGUE) {
      expect(album.slug, albumName(album)).toMatch(URL_SAFE);
      for (const version of album.versions ?? []) expect(version.slug, `${albumName(album)}, ${version.name}`).toMatch(URL_SAFE);
    }
  });

  it("give every Album and every Version a page of its own", () => {
    const paths = CATALOGUE.flatMap((album) => [albumPath(album), ...(album.versions ?? []).map((version) => versionPath(album, version))]);

    expect(new Set(CATALOGUE.map(({ slug }) => slug)).size).toBe(CATALOGUE.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("name Taylor's Versions as such", () => {
    expect(CATALOGUE.filter(isTaylorsVersion).map(({ slug }) => slug)).toEqual([
      "fearless-taylors-version",
      "speak-now-taylors-version",
      "red-taylors-version",
      "1989-taylors-version",
    ]);
  });

  it("open every page from its own address", () => {
    for (const album of CATALOGUE) {
      expect(findRelease(album.slug)).toEqual({ album, version: undefined });
      for (const version of album.versions ?? []) expect(findRelease(album.slug, version.slug)).toEqual({ album, version });
    }
    expect(findRelease()).toEqual({ album: CATALOGUE[0], version: undefined });
  });

  it("still lead every Deezer ID an old link may carry to its page", () => {
    for (const album of CATALOGUE) {
      for (const id of [album.id, ...(album.aliases ?? [])]) expect(pathOfDeezerId(id), id).toBe(albumPath(album));
      for (const version of album.versions ?? []) expect(pathOfDeezerId(version.id), version.id).toBe(versionPath(album, version));
    }
  });
});
