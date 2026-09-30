import "server-only";

import { albumPath, eraAlbum, isTaylorsVersion } from "@/lib/catalogue";
import { ERA_SLUGS, type EraSlug } from "@/lib/eras";
import { getAlbums } from "@/service/deezer";

/** The Album that stands for an Era on the home page. */
export type EraAlbum = {
  /** Its catalogue ID. */
  id: string;
  /** Its page on Music, the canonical one (lib/catalogue.ts). */
  path: string;
  cover?: string;
  taylorsVersion: boolean;
};

/**
 * The Album standing for each Era (lib/catalogue.ts), with its cover fetched
 * on the server from Deezer (cached for a day, service/deezer.ts). If Deezer
 * is down the page still renders: every Era keeps its link, just without a
 * cover.
 */
export async function getEraAlbums(): Promise<Record<EraSlug, EraAlbum>> {
  const entries = ERA_SLUGS.map(eraAlbum);
  const albums = await getAlbums(entries.map(({ id }) => id)).catch(() => undefined);

  return Object.fromEntries(
    entries.map((entry, index) => [
      entry.era,
      // Deezer may answer an ID with a regional twin: only its cover is used, the link is the catalogue's.
      { id: entry.id, path: albumPath(entry), cover: albums?.[index]?.cover_xl, taylorsVersion: isTaylorsVersion(entry) },
    ]),
  ) as Record<EraSlug, EraAlbum>;
}
