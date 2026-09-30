import "server-only";

import type { Album } from "@/types";
import type { EraSlug } from "@/lib/eras";

import { CATALOGUE, albumName, albumPath, albumYear, findAlbum, isTaylorsVersion, versionPath } from "@/lib/catalogue";
import { getAlbums, toAlbum } from "@/service/deezer";

/** An Album on the Music page's shelf: its Deezer cover and ID, named and placed by the catalogue. */
export type ShelfAlbum = Album & {
  era: EraSlug;
  /** The catalogue's ID for it (`id` is the one Deezer answered with, maybe a regional twin). */
  catalogueId: string;
  /** Its page, from the catalogue ID (lib/catalogue.ts): every link to the Album uses it, never `id`. */
  path: string;
  /** Its title without edition or "(Taylor's Version)": "Fearless". */
  title: string;
  edition: string | null;
  year: number;
  /** Its original release date, "2017-11-10". */
  released: string;
  taylorsVersion: boolean;
  /** For a Taylor's Version, the shelf ID of the Album it re-records. */
  reRecords: string | null;
};

/** One version of the open Album, for the row of versions under its title. */
export type AlbumVersionCard = {
  /** The Deezer ID its tracklist uses. */
  id: string;
  /** Its page: the Album's own for the shelf's edition, the Version's otherwise. */
  path: string;
  /** "Standard Edition", "3am Edition"; the shelf's own edition first. */
  name: string;
  released: string;
  cover: string;
};

/**
 * Every catalogue Album (lib/catalogue.ts), in Era order, with its Deezer
 * cover. Names come from the catalogue, not Deezer, whose titles vary by
 * catalog region.
 */
export async function getShelf(): Promise<ShelfAlbum[]> {
  const albums = await getAlbums(CATALOGUE.map(({ id }) => id));
  // Deezer may answer with a regional twin: a Taylor's Version points at the ID its original is listed under.
  const shelfId = (catalogueId: string) => String(albums[CATALOGUE.findIndex(({ id }) => id === catalogueId)].id);

  return CATALOGUE.map((entry, index) => ({
    ...toAlbum(albums[index]),
    name: albumName(entry),
    era: entry.era,
    catalogueId: entry.id,
    path: albumPath(entry),
    title: entry.title,
    edition: entry.edition ?? null,
    year: albumYear(entry),
    released: entry.released,
    taylorsVersion: isTaylorsVersion(entry),
    reRecords: entry.reRecords ? shelfId(entry.reRecords) : null,
  }));
}

/**
 * The shelf Album a `?album=<id>` asks for: by the ID on the shelf, else by
 * any Deezer ID of the same Album (another edition, a regional twin).
 * Anything else opens the debut Album.
 */
export function pickAlbum(shelf: ShelfAlbum[], wanted: string | undefined): ShelfAlbum | undefined {
  const catalogueId = findAlbum(wanted)?.id;

  return shelf.find(({ id }) => id === wanted) ?? shelf.find((album) => album.catalogueId === catalogueId) ?? shelf[0];
}

/**
 * The ID of the version a `?album=<id>` asks for, when it is one of this
 * Album's versions; otherwise the Album's own (shelf) ID.
 */
export function pickVersion(album: ShelfAlbum, wanted: string | undefined): string {
  const entry = CATALOGUE.find(({ id }) => id === album.catalogueId);

  return entry?.versions?.some(({ id }) => id === wanted) ? wanted! : album.id;
}

/**
 * Every version of an Album, the shelf's own edition first, each with its
 * Deezer cover; empty when the Album has only the one.
 */
export async function getVersions(album: ShelfAlbum): Promise<AlbumVersionCard[]> {
  const versions = CATALOGUE.find(({ id }) => id === album.catalogueId)?.versions ?? [];

  if (!versions.length) return [];
  const covers = await getAlbums(versions.map(({ id }) => id));

  return [
    { id: album.id, path: album.path, name: album.edition ?? "The Album", released: album.released, cover: album.images[0].url },
    ...versions.map((version, index) => ({ ...version, path: versionPath(version), cover: toAlbum(covers[index]).images[0].url })),
  ];
}
