import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/albums/route";
import { getShelf, getVersions, pickAlbum, pickVersion, type ShelfAlbum } from "@/components/music/catalogue";
import { CATALOGUE, albumPath, findAlbum } from "@/lib/catalogue";

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
  Resolving a `?album=<id>`: the shelf holds each catalogue Album under the
  ID Deezer answered, so here Fearless is on it under its twin's ID.
*/
describe("findAlbum, pickAlbum and pickVersion", () => {
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

	it.each([
		["the ID on the shelf", FEARLESS_TWIN, FEARLESS],
		["the catalogue's ID, when the shelf has its twin", FEARLESS, FEARLESS],
		["another twin", "81389432", FEARLESS],
		["a version", "283925", FEARLESS],
		["a Taylor's Version", FEARLESS_TV, FEARLESS_TV],
		["a Chapter of Red (Taylor's Version)", "289970772", "272247412"],
		["an unknown ID (the debut)", "1", "227786"],
		["nothing (the debut)", undefined, "227786"],
	])("pickAlbum opens the Album for %s", (_, wanted, catalogueId) => {
		expect(pickAlbum(shelf, wanted)?.catalogueId).toBe(catalogueId);
	});

	it("pickAlbum opens nothing on an empty shelf", () => {
		expect(pickAlbum([], "227786")).toBeUndefined();
	});

	it.each([
		["one of its versions", FEARLESS, "283925", "283925"],
		["the US Standard Edition", FEARLESS, "130714702", "130714702"],
		["the shelf's own ID", FEARLESS, FEARLESS_TWIN, FEARLESS_TWIN],
		["an alias: the shelf's edition", FEARLESS, "130714712", FEARLESS_TWIN],
		["the catalogue's ID: the shelf's edition", FEARLESS, FEARLESS, FEARLESS_TWIN],
		["another Album's version: the shelf's edition", FEARLESS, "874936972", FEARLESS_TWIN],
		["nothing: the shelf's edition", FEARLESS, undefined, FEARLESS_TWIN],
		["an Album with no versions", "52612062", "283925", "52612062"],
	])("pickVersion opens %s", (_, catalogueId, wanted, versionId) => {
		expect(pickVersion(byCatalogueId(shelf, catalogueId), wanted)).toBe(versionId);
	});
});
