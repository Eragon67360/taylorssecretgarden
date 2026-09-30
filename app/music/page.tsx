import type { Metadata } from "next";

import { getShelf, getVersions, pickAlbum, pickVersion } from "@/components/music/catalogue";
import { formatReleaseDate } from "@/components/music/format";
import { MusicJournal } from "@/components/music/music-journal";
import { CATALOGUE, albumName, findAlbum } from "@/lib/catalogue";
import { musicPath, pageMetadata } from "@/lib/metadata";
import { getAlbumDetails } from "@/service/deezer";

type MusicProps = { searchParams: Promise<{ album?: string | string[] }> };

const albumParam = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/**
 * /music on its own opens on the first Album; `?album=<id>` is that Album's
 * page (or its Version's), with its own title, description and canonical link
 * (lib/metadata.ts). Worked out from the catalogue alone: no Deezer call.
 */
export async function generateMetadata({ searchParams }: MusicProps): Promise<Metadata> {
  const wanted = albumParam((await searchParams).album);
  const path = musicPath(wanted);
  const album = findAlbum(wanted);

  if (!album || path === "/music") {
    return pageMetadata({
      title: "Music",
      description: "Every Taylor Swift Era as a polaroid on a shelf: pick an Album, read its tracklist, hear 30-second previews.",
      path: "/music",
    });
  }
  const version = album.versions?.find(({ id }) => id === wanted);
  const original = album.reRecords ? CATALOGUE.find(({ id }) => id === album.reRecords) : undefined;
  const name = version ? `${albumName(album)}, ${version.name}` : albumName(album);
  let about = `${name} by Taylor Swift, released ${formatReleaseDate(album.released)}${album.edition ? `, in its ${album.edition}` : ""}`;

  if (version) about = `${name}, by Taylor Swift, released ${formatReleaseDate(version.released)}`;
  else if (original) about = `${name}, Taylor Swift's re-recording of ${albumName(original)}, released ${formatReleaseDate(album.released)}`;

  return pageMetadata({
    title: `${name} tracklist`,
    description: `${about}: the tracklist with running times and 30-second previews.`,
    path,
  });
}

/**
 * The music journal. The selected Album lives in the URL (`?album=<id>`), so
 * a link to an Album (or to one of its versions, `?album=<version id>`) is
 * shareable; the shelf, the Album's versions and the version's details are
 * fetched here, on the server (Deezer responses are cached, see service/deezer.ts).
 */
export default async function Music({ searchParams }: MusicProps) {
  const wanted = albumParam((await searchParams).album);
  const shelf = await getShelf();
  const selected = pickAlbum(shelf, wanted);
  const versionId = selected && pickVersion(selected, wanted);
  const [details, versions] = selected && versionId ? await Promise.all([getAlbumDetails(versionId), getVersions(selected)]) : [undefined, []];

  return <MusicJournal albumId={selected?.id} details={details} shelf={shelf} versionId={versionId} versions={versions} />;
}
