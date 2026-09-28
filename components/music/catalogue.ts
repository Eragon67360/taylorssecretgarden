import "server-only";

import type { Album } from "@/types";

import { ERA_BY_ALBUM_ID, ERA_SLUGS, type EraSlug, eraOfAlbum } from "@/lib/eras";
import { getAlbums, toAlbum } from "@/service/deezer";

/** An Album on the Music page's shelf, with the Era whose look it wears. */
export type ShelfAlbum = Album & { era: EraSlug };

const DEBUT_ID = Object.keys(ERA_BY_ALBUM_ID).find((id) => ERA_BY_ALBUM_ID[id] === "debut");

/** The curated Albums (lib/eras.ts), in Era order: one polaroid per Era. */
export async function getShelf(): Promise<ShelfAlbum[]> {
  const albums = await getAlbums(Object.keys(ERA_BY_ALBUM_ID).map(Number));

  return albums
    .flatMap((album) => {
      const era = eraOfAlbum(album);

      return era ? [{ ...toAlbum(album), era }] : [];
    })
    .sort((a, b) => ERA_SLUGS.indexOf(a.era) - ERA_SLUGS.indexOf(b.era));
}

/**
 * The shelf Album a `?album=<id>` asks for. Deezer may answer a curated ID
 * with a regional twin (another ID for the same Album), so a curated ID also
 * finds its Era's Album on the shelf. Anything else opens the debut Album.
 */
export function pickAlbum(shelf: ShelfAlbum[], wanted: string | undefined): ShelfAlbum | undefined {
  const byId = (id: string | undefined) => shelf.find((album) => album.id === id);
  const byEra = (era: EraSlug | undefined) => shelf.find((album) => album.era === era);

  return byId(wanted) ?? byEra(wanted ? ERA_BY_ALBUM_ID[wanted] : undefined) ?? byId(DEBUT_ID) ?? byEra("debut") ?? shelf[0];
}
