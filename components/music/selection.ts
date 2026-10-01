import type { ShelfAlbum } from "./catalogue";

import { findRelease } from "@/lib/catalogue";

/** What the music journal has open: the shelf Album, and the Deezer ID whose tracklist shows. */
export type Selection = { albumId: string; versionId: string };

/**
 * What a Music address opens, from its slugs: [] for /music (the first
 * Album), [album] or [album, version]. An Album's own tracklist is the one
 * Deezer answered its shelf ID with (maybe a regional twin); a Version's is
 * its own ID. Undefined for an address the catalogue does not know, or an
 * empty shelf.
 */
export function selectRelease(shelf: ShelfAlbum[], [albumSlug, versionSlug]: readonly string[]): (Selection & { album: ShelfAlbum }) | undefined {
  const release = findRelease(albumSlug, versionSlug);
  const album = release && shelf.find(({ catalogueId }) => catalogueId === release.album.id);

  return album && { album, albumId: album.id, versionId: release.version?.id ?? album.id };
}
