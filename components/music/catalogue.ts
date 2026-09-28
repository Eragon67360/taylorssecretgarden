import "server-only";

import type { Album } from "@/types";
import type { EraSlug } from "@/lib/eras";

import { CATALOGUE, albumName, albumYear, findAlbum, isTaylorsVersion } from "@/lib/catalogue";
import { getAlbums, toAlbum } from "@/service/deezer";

/** An Album on the Music page's shelf: its Deezer cover and ID, named and placed by the catalogue. */
export type ShelfAlbum = Album & {
  era: EraSlug;
  /** The catalogue's ID for it (`id` is the one Deezer answered with, maybe a regional twin). */
  catalogueId: string;
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

/**
 * Every catalogue Album (lib/catalogue.ts), in Era order, with its Deezer
 * cover. Names come from the catalogue, not Deezer, whose titles vary by
 * catalog region.
 */
export async function getShelf(): Promise<ShelfAlbum[]> {
  const albums = await getAlbums(CATALOGUE.map(({ id }) => id));
  const shelfId = (id: string) => String(albums[CATALOGUE.findIndex((album) => album.id === id)].id);

  return CATALOGUE.map((entry, index) => ({
    ...toAlbum(albums[index]),
    name: albumName(entry),
    era: entry.era,
    catalogueId: entry.id,
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
