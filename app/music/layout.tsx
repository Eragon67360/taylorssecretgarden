import type { ReactNode } from "react";
import type { AlbumLink } from "@/components/music/music-journal";

import { getEveryVersion, getShelf } from "@/components/music/catalogue";
import { MusicJournal } from "@/components/music/music-journal";
import { CATALOGUE, albumName, albumPath, albumYear, originalOf, taylorsVersionOf } from "@/lib/catalogue";
import { TOURS, tourYears } from "@/lib/tours";

/*
  Every Music page is prerendered (/music, /music/<album>,
  /music/<album>/<version>) and refreshed at most hourly, from Deezer data
  cached for a day (service/deezer.ts, components/music/catalogue.ts): a
  page built while Deezer failed mends within the hour.
*/
export const revalidate = 3600;

/**
 * Each Album's links to its cluster, by catalogue ID: the Album it re-records
 * or its Taylor's Version, and its Era's Tour. Named for what they open, at
 * their canonical addresses.
 */
function albumLinks(): Record<string, AlbumLink[]> {
  return Object.fromEntries(
    CATALOGUE.map((album) => {
      const original = originalOf(album);
      const rerecording = taylorsVersionOf(album);
      const tour = TOURS.find(({ era }) => era === album.era);
      const links: AlbumLink[] = [
        ...(original ? [{ lead: "a re-recording of", href: albumPath(original), text: `${albumName(original)} (${albumYear(original)})` }] : []),
        ...(rerecording ? [{ lead: "re-recorded as", href: albumPath(rerecording), text: albumName(rerecording) }] : []),
        ...(tour ? [{ lead: "on tour:", href: `/tours/${tour.slug}`, text: `${tour.tour} (${tourYears(tour)})` }] : []),
      ];

      return [album.id, links];
    }),
  );
}

/**
 * The music journal around every Music page: the shelf and every Album's
 * versions are the same on all of them, so moving between Albums and
 * versions only brings in the new page's facts and tracklist, and the
 * journal (its Era fade, the cover's swing, the focus) carries on.
 */
export default async function MusicLayout({ children }: { children: ReactNode }) {
  const shelf = await getShelf();

  return (
    <MusicJournal links={albumLinks()} shelf={shelf} versions={await getEveryVersion(shelf)}>
      {children}
    </MusicJournal>
  );
}
