import "server-only";

import { ERA_BY_ALBUM_ID, type EraSlug, eraOfAlbum, isTaylorsVersion } from "@/lib/eras";
import { getAlbums } from "@/service/deezer";

/** The Album that stands for an Era on the home page. */
export type EraAlbum = {
  /** The Deezer ID the Music page selects (`/music?album=<id>`). */
  id: string;
  title: string;
  cover?: string;
  taylorsVersion: boolean;
};

/** The curated Album of each Era (lib/eras.ts), before anything is fetched. */
const CURATED: Record<EraSlug, string> = Object.fromEntries(
  Object.entries(ERA_BY_ALBUM_ID).map(([id, era]) => [era, id]),
) as Record<EraSlug, string>;

/**
 * Each Era's Album with its cover, fetched on the server from Deezer (cached
 * for a day, service/deezer.ts). If Deezer is down the page still renders:
 * every Era keeps its curated Album ID, just without a cover.
 */
export async function getEraAlbums(): Promise<Record<EraSlug, EraAlbum>> {
  const albums = await getAlbums(Object.keys(ERA_BY_ALBUM_ID).map(Number)).catch(() => []);
  const byEra = Object.fromEntries(
    Object.entries(CURATED).map(([era, id]) => [era, { id, title: "", taylorsVersion: false }]),
  ) as Record<EraSlug, EraAlbum>;

  for (const album of albums) {
    const era = eraOfAlbum(album);

    // Deezer may answer an ID with a regional twin; link to the ID it returned,
    // which is the one the Music page lists.
    if (era) byEra[era] = { id: String(album.id), title: album.title, cover: album.cover_xl, taylorsVersion: isTaylorsVersion(album.title) };
  }

  return byEra;
}
