import "server-only";

import { unstable_cache } from "next/cache";

import { CATALOGUE } from "@/lib/catalogue";
import { getAlbums, getAlbumTracks } from "@/service/deezer";

/*
  Which Deezer tracks the site previews: those of a catalogue Album or of one
  of its Versions, as the Music page lists them. /api/preview answers only
  for these, so it is not an open redirector to any Deezer preview, and a
  made-up ID never reaches Deezer's shared quota.

  The set is built from the same cached tracklists the Music page reads
  (service/deezer.ts), and kept for a day as one entry: at most one pass over
  the tracklists a day, never a Deezer call per preview.
*/

/** A Deezer track ID: a positive integer, 12 digits at most (today's are 10). */
const TRACK_ID = /^[1-9]\d{0,11}$/;

export const isTrackId = (value: string) => TRACK_ID.test(value);

async function loadCatalogueTrackIds(): Promise<string[]> {
  const catalogueIds = CATALOGUE.flatMap((album) => [album.id, ...(album.versions ?? []).map(({ id }) => id)]);
  // The Music page opens an Album by the ID Deezer answered with, maybe a regional twin (components/music/catalogue.ts).
  const shelfIds = (await getAlbums(CATALOGUE.map(({ id }) => id))).map(({ id }) => String(id));
  const tracklists = await Promise.all([...new Set([...catalogueIds, ...shelfIds])].map((id) => getAlbumTracks(id)));

  return [...new Set(tracklists.flat().map(({ id }) => String(id)))];
}

const catalogueTrackIds = unstable_cache(loadCatalogueTrackIds, ["catalogue-track-ids"], { revalidate: 86400 });

/** Whether the track is on a catalogue Album or Version. Throws when Deezer cannot say (not cached yet, and down). */
export async function isCatalogueTrack(trackId: string): Promise<boolean> {
  if (!isTrackId(trackId)) return false;

  return (await catalogueTrackIds()).includes(trackId);
}
