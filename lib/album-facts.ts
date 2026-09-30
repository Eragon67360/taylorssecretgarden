import "server-only";

import type { Track } from "@/types";

import { getShelf } from "@/components/music/catalogue";
import { formatRunningTime } from "@/components/music/format";
import { getAlbumDetails } from "@/service/deezer";

/** An Album's facts from its tracklist, as its page on Music shows them. */
export type AlbumFacts = { songs: number; runningTime: string; label: string; tracks: Track[] };

/** "19 songs, 1 h 13 min, label Big Machine Records, LLC": the edition shown, as its page gives it. */
export const tracklistFacts = ({ songs, runningTime, label }: AlbumFacts) => `${songs} songs, ${runningTime}${label ? `, label ${label}` : ""}`;

/**
 * Every Album's facts, by catalogue ID, from the same (cached) Deezer data
 * its page reads: the edition on the shelf, fetched by the ID Deezer answered
 * with. For /llms.txt and /llms-full.txt, built once at build time. An Album
 * Deezer fails to answer is left out rather than failing the whole file.
 */
export async function getAlbumFacts(): Promise<Map<string, AlbumFacts>> {
  const shelf = await getShelf().catch(() => []);
  const facts = await Promise.all(
    shelf.map(async (album): Promise<[string, AlbumFacts] | undefined> => {
      try {
        const { tracks, label } = await getAlbumDetails(album.id);

        return [
          album.catalogueId,
          {
            songs: tracks.items.length,
            runningTime: formatRunningTime(tracks.items.reduce((total, track) => total + track.duration_ms, 0)),
            label,
            tracks: tracks.items,
          },
        ];
      } catch {
        return undefined;
      }
    }),
  );

  return new Map(facts.filter((entry) => entry !== undefined));
}
