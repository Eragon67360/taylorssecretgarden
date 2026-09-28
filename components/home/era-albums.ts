import "server-only";

import { eraAlbum, isTaylorsVersion } from "@/lib/catalogue";
import { ERA_SLUGS, type EraSlug } from "@/lib/eras";
import { getAlbums } from "@/service/deezer";

/** The Album that stands for an Era on the home page. */
export type EraAlbum = {
  /** The Deezer ID the Music page selects (`/music?album=<id>`). */
  id: string;
  cover?: string;
  taylorsVersion: boolean;
};

/**
 * The Album standing for each Era (lib/catalogue.ts), with its cover fetched
 * on the server from Deezer (cached for a day, service/deezer.ts). If Deezer
 * is down the page still renders: every Era keeps its catalogue ID, just
 * without a cover.
 */
export async function getEraAlbums(): Promise<Record<EraSlug, EraAlbum>> {
  const entries = ERA_SLUGS.map(eraAlbum);
  const albums = await getAlbums(entries.map(({ id }) => id)).catch(() => undefined);

  return Object.fromEntries(
    entries.map((entry, index) => {
      const album = albums?.[index];

      // Deezer may answer an ID with a regional twin; link to the ID it
      // returned, which is the one the Music page lists.
      return [entry.era, { id: album ? String(album.id) : entry.id, cover: album?.cover_xl, taylorsVersion: isTaylorsVersion(entry) }];
    }),
  ) as Record<EraSlug, EraAlbum>;
}
