import type { Metadata } from "next";

import { getShelf, pickAlbum } from "@/components/music/catalogue";
import { MusicJournal } from "@/components/music/music-journal";
import { getAlbumDetails } from "@/service/deezer";

export const metadata: Metadata = {
  title: "Music",
  description: "Every Taylor Swift Era as a polaroid on a shelf: pick an Album, read its tracklist, hear 30-second previews.",
};

type MusicProps = { searchParams: Promise<{ album?: string | string[] }> };

/**
 * The music journal. The selected Album lives in the URL (`?album=<id>`), so
 * a link to an Album is shareable; the shelf and the Album's details are
 * fetched here, on the server (Deezer responses are cached, see service/deezer.ts).
 */
export default async function Music({ searchParams }: MusicProps) {
  const { album: wanted } = await searchParams;
  const shelf = await getShelf();
  const selected = pickAlbum(shelf, typeof wanted === "string" ? wanted : undefined);
  const details = selected && (await getAlbumDetails(selected.id));

  return <MusicJournal details={details} shelf={shelf} />;
}
