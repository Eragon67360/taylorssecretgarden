import "server-only";

import type { Album } from "@/types";
import type { EraSlug } from "@/lib/eras";

import { unstable_cache } from "next/cache";

import { CATALOGUE, albumName, albumPath, albumYear, findAlbum, isTaylorsVersion, versionPath } from "@/lib/catalogue";
import { getAlbum, getAlbums } from "@/service/deezer";

const DAY = 86400;

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

/** What the shelf keeps of a Deezer Album: the ID Deezer answered with and its cover. */
type ShelfCover = { id: string; cover: string };

/** Thrown by the shelf's cache when Deezer failed some Albums, so that no partial shelf is cached; carries what it got. */
class IncompleteShelf extends Error {
  constructor(readonly covers: (ShelfCover | undefined)[]) {
    super("Deezer failed some of the shelf's Albums");
  }
}

/*
  The whole shelf's covers as one cache entry, for a day: a warm page reads
  it once instead of once per Album. Only a complete shelf is cached; when
  Deezer fails some Albums, the entry throws what it got (IncompleteShelf),
  so the next visit asks again rather than showing blank covers for a day.
  The catalogue's IDs are in the key, so a catalogue change starts afresh.
*/
const cachedShelfCovers = unstable_cache(
  async (): Promise<ShelfCover[]> => {
    const results = await Promise.allSettled(CATALOGUE.map(({ id }) => getAlbum(id)));
    const covers = results.map((result) => (result.status === "fulfilled" ? { id: String(result.value.id), cover: result.value.cover_xl } : undefined));

    if (covers.includes(undefined)) throw new IncompleteShelf(covers);

    return covers as ShelfCover[];
  },
  ["music", "shelf", CATALOGUE.map(({ id }) => id).join()],
  { revalidate: DAY },
);

/**
 * Every catalogue Album (lib/catalogue.ts), in Era order, with its Deezer
 * cover. Names come from the catalogue, not Deezer, whose titles vary by
 * catalog region. If Deezer fails an Album, it is still on the shelf, under
 * its catalogue ID and without a cover (`images` empty), like the Home page's.
 */
export async function getShelf(): Promise<ShelfAlbum[]> {
  const covers = await cachedShelfCovers().catch((error: unknown) => (error instanceof IncompleteShelf ? error.covers : []));
  // Deezer may answer with a regional twin: a Taylor's Version points at the ID its original is listed under.
  const shelfId = (catalogueId: string) => covers[CATALOGUE.findIndex(({ id }) => id === catalogueId)]?.id ?? catalogueId;

  return CATALOGUE.map((entry, index) => ({
    id: covers[index]?.id ?? entry.id,
    images: covers[index] ? [{ url: covers[index].cover }] : [],
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
 * Deezer cover; empty when the Album has only the one, or when Deezer fails
 * (the page then shows the shelf's edition alone).
 */
export async function getVersions(album: ShelfAlbum): Promise<AlbumVersionCard[]> {
  const versions = CATALOGUE.find(({ id }) => id === album.catalogueId)?.versions ?? [];
  const shelfCover = album.images[0]?.url;

  if (!versions.length || !shelfCover) return [];
  const covers = await cachedVersionCovers(versions.map(({ id }) => id)).catch(() => undefined);

  if (!covers) return [];

  return [
    { id: album.id, path: album.path, name: album.edition ?? "The Album", released: album.released, cover: shelfCover },
    ...versions.map((version, index) => ({ ...version, path: versionPath(version), cover: covers[index] })),
  ];
}

/** An Album's versions' covers, in order, as one cache entry per Album; fails (and caches nothing) if any does. */
const cachedVersionCovers = unstable_cache(
  async (versionIds: string[]) => (await getAlbums(versionIds)).map(({ cover_xl }) => cover_xl),
  ["music", "version-covers"],
  { revalidate: DAY },
);
