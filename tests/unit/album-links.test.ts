import { beforeEach, describe, expect, it, vi } from "vitest";

import { CATALOGUE, albumPath } from "@/lib/catalogue";

/*
  Deezer answers US servers (production renders there) with regional twins:
  another ID for the same Album. Links must still use the catalogue's IDs,
  the ones in the sitemap and the canonical links.
*/
const TWINS: Record<string, number> = { "426350": 130714712, "227786": 81389452 };

const deezerAlbum = (id: string) => ({
  id: TWINS[id] ?? Number(id),
  title: "Deezer's title",
  cover_xl: `https://cdn-images.dzcdn.net/images/cover/${id}/1000x1000.jpg`,
  release_date: "",
  record_type: "album",
});

vi.mock("@/service/deezer", () => ({
  getAlbum: async (id: string) => deezerAlbum(id),
  getAlbums: async (ids: string[]) => ids.map(deezerAlbum),
  toAlbum: (album: { id: number; title: string; cover_xl: string }) => ({ id: String(album.id), name: album.title, images: [{ url: album.cover_xl }] }),
}));

// The shelf's caches (components/music/catalogue.ts), in memory.
vi.mock("next/cache", () => import("../stubs/next-cache"));

// The Era looks (lib/eras.ts) load their faces with next/font, which only runs in a Next build.
vi.mock("next/font/local", () => ({ default: () => ({ className: "", variable: "", style: { fontFamily: "serif" } }) }));

const { getShelf, getVersions } = await import("@/components/music/catalogue");
const { selectRelease } = await import("@/components/music/selection");
const { getEraAlbums } = await import("@/components/home/era-albums");

describe("links to Albums when Deezer answers with regional twins", () => {
  let shelf: Awaited<ReturnType<typeof getShelf>>;

  beforeEach(async () => {
    shelf = await getShelf();
  });

  it("the shelf links every Album at its catalogue path, whatever ID Deezer answered with", () => {
    expect(shelf.map(({ path }) => path)).toEqual(CATALOGUE.map(albumPath));
    const fearless = shelf.find(({ catalogueId }) => catalogueId === "426350")!;

		// Deezer's twin still fetches the tracklist; the link is the catalogue's.
		expect(fearless.id).toBe("130714712");
		expect(fearless.path).toBe("/music/fearless");
		expect(shelf[0].path).toBe("/music");
	});

	it("the first Version card links the Album's own page, the others their own", async () => {
		const fearless = shelf.find(({ catalogueId }) => catalogueId === "426350")!;
		const versions = await getVersions(fearless);

		expect(versions.map(({ path }) => path)).toEqual([
			"/music/fearless",
			"/music/fearless/standard-edition",
			"/music/fearless/international-version",
			"/music/fearless/live-from-clear-channel-stripped-2008",
		]);
	});

	it("the Album's page opens it on its own edition, by the ID Deezer answered with", () => {
		const fearless = selectRelease(shelf, ["fearless"])!;

		expect(fearless.album.catalogueId).toBe("426350");
		expect(fearless.versionId).toBe("130714712");
	});

  it("Home's pressed Eras link their Album's catalogue path", async () => {
    const albums = await getEraAlbums();

		expect(albums.debut.path).toBe("/music");
		expect(albums.fearless.path).toBe("/music/fearless-taylors-version");
		expect(Object.values(albums).every(({ path }) => CATALOGUE.map(albumPath).includes(path))).toBe(true);
	});
});
