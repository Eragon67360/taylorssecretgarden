import { beforeEach, describe, expect, it, vi } from "vitest";

import { CATALOGUE } from "@/lib/catalogue";

// Deezer is mocked: every catalogue Album or Version holds track <albumId>01,
// and Deezer answers the first Album with a regional twin, 999.
const deezer = vi.hoisted(() => ({ getAlbums: vi.fn(), getAlbumTracks: vi.fn() }));

vi.mock("next/cache", () => ({ unstable_cache: <T>(load: T) => load }));
vi.mock("@/service/deezer", () => deezer);

const { isCatalogueTrack, isTrackId } = await import("@/service/catalogue-tracks");

beforeEach(() => {
  deezer.getAlbums.mockReset().mockImplementation(async (ids: string[]) => ids.map((id, index) => ({ id: index === 0 ? 999 : Number(id) })));
  deezer.getAlbumTracks.mockReset().mockImplementation(async (albumId: string) => [{ id: Number(`${albumId}01`) }]);
});

describe("isCatalogueTrack", () => {
  it("knows the tracks of catalogue Albums, their Versions and the twins Deezer answers with", async () => {
    const version = CATALOGUE.find((album) => album.versions?.length)!.versions![0];

    expect(await isCatalogueTrack(`${CATALOGUE[1].id}01`)).toBe(true);
    expect(await isCatalogueTrack(`${version.id}01`)).toBe(true);
    expect(await isCatalogueTrack("99901")).toBe(true);
  });

  it("refuses any other track", async () => {
    expect(await isCatalogueTrack("3135556")).toBe(false);
  });

  it("refuses a malformed ID without asking Deezer", async () => {
    for (const id of ["abc", "0123", "-1", "1".repeat(13), "12 34", ""]) expect(await isCatalogueTrack(id)).toBe(false);
    expect(deezer.getAlbumTracks).not.toHaveBeenCalled();
  });

  it("reads each tracklist once per pass, not once per track", async () => {
    await isCatalogueTrack("3135556");

    const albums = new Set(deezer.getAlbumTracks.mock.calls.map(([id]) => id));

    expect(deezer.getAlbumTracks.mock.calls).toHaveLength(albums.size);
  });

  it("throws when Deezer cannot give a tracklist, so the route answers 502 rather than a false 404", async () => {
    deezer.getAlbumTracks.mockRejectedValueOnce(new Error("Deezer down"));

    await expect(isCatalogueTrack("3135556")).rejects.toThrow("Deezer down");
  });
});

describe("isTrackId", () => {
  it("takes positive integers of up to 12 digits", () => {
    expect(isTrackId("1")).toBe(true);
    expect(isTrackId("3135556")).toBe(true);
    expect(isTrackId("9".repeat(12))).toBe(true);
    expect(isTrackId("9".repeat(13))).toBe(false);
    expect(isTrackId("0")).toBe(false);
  });
});
