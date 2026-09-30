import type { Metadata } from "next";
import type { AlbumDetails } from "@/types";
import type { AlbumLink } from "@/components/music/music-journal";

import { getShelf, getVersions, pickAlbum, pickVersion } from "@/components/music/catalogue";
import { formatReleaseDate } from "@/components/music/format";
import { MusicJournal } from "@/components/music/music-journal";
import { JsonLd, TAYLOR_SWIFT, isoDuration } from "@/components/json-ld";
import {
  type AlbumVersion,
  type CatalogueAlbum,
  CATALOGUE,
  albumName,
  albumYear,
  findAlbum,
  originalOf,
  releaseName,
  taylorsVersionOf,
  versionKind,
} from "@/lib/catalogue";
import { absoluteUrl, albumPath, musicPath, pageMetadata } from "@/lib/metadata";
import { TOURS, tourYears } from "@/lib/tours";
import { getAlbumDetails } from "@/service/deezer";

type MusicProps = { searchParams: Promise<{ album?: string | string[] }> };

const albumParam = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/** "Red tracklist (Taylor Swift)"; a Taylor's Version already says whose it is. */
const tracklistTitle = (name: string) => (name.includes("(Taylor's Version)") ? `${name} tracklist` : `${name} tracklist (Taylor Swift)`);

/**
 * /music on its own opens on the first Album; `?album=<id>` is that Album's
 * page (or its Version's), with its own title, description and canonical link
 * (lib/metadata.ts). Worked out from the catalogue alone: no Deezer call.
 * Descriptions answer first: the release, whose it is, when.
 */
export async function generateMetadata({ searchParams }: MusicProps): Promise<Metadata> {
  const wanted = albumParam((await searchParams).album);
  const path = musicPath(wanted);
  const album = findAlbum(wanted);

  if (!album || path === "/music") {
    const debut = CATALOGUE[0];

    return pageMetadata({
      title: "Taylor Swift's Albums and tracklists",
      description: `Taylor Swift's ${CATALOGUE.length} Albums in Era order, opening on her debut, ${debut.title} (${formatReleaseDate(debut.released)}): its tracklist, running times and song previews.`,
      path: "/music",
    });
  }
  const version = album.versions?.find(({ id }) => id === wanted);
  const original = originalOf(album);
  const name = releaseName(album, version);
  let about = `${name}, Taylor Swift's ${albumYear(album)} Album, released ${formatReleaseDate(album.released)}${album.edition ? ` (${album.edition} shown)` : ""}`;

  if (version) about = `${name}, a Taylor Swift release of ${formatReleaseDate(version.released)}`;
  else if (original) about = `${name}, Taylor Swift's re-recording of ${albumName(original)}, released ${formatReleaseDate(album.released)}`;

  return pageMetadata({
    title: tracklistTitle(name),
    description: `${about}: every song with its running time, the label and 30-second previews.`,
    path,
  });
}

/** schema.org's production type for a Version: a live album, a compilation, or the studio Album again. */
const PRODUCTION_TYPE = { live: "LiveAlbum", compilation: "CompilationAlbum", studio: "StudioAlbum" } as const;

/**
 * The page's own release as a MusicAlbum: the Album on its page, or the
 * Version on a Version's page (its name, date and canonical URL), with its
 * tracks and label from Deezer. `albumRelease` names the edition shown and
 * which Album it is a release of; a Taylor's Version is based on its original.
 */
function musicAlbumData(album: CatalogueAlbum, version: AlbumVersion | undefined, details: AlbumDetails | undefined) {
  const albumUrl = absoluteUrl(albumPath(album));
  const url = version ? absoluteUrl(musicPath(version.id)) : albumUrl;
  const original = originalOf(album);
  const tracks = details?.tracks.items ?? [];
  const release = releaseName(album, version, { edition: true });

  return {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    "@id": url,
    name: releaseName(album, version),
    url,
    byArtist: TAYLOR_SWIFT,
    datePublished: version?.released ?? album.released,
    albumProductionType: `https://schema.org/${PRODUCTION_TYPE[version ? versionKind(version) : "studio"]}`,
    albumReleaseType: "https://schema.org/AlbumRelease",
    ...(details && { image: details.images[0].url }),
    albumRelease: {
      "@type": "MusicRelease",
      name: release,
      url,
      datePublished: version?.released ?? album.released,
      ...(details?.label && { recordLabel: { "@type": "Organization", name: details.label } }),
      releaseOf: { "@type": "MusicAlbum", "@id": albumUrl, name: albumName(album), url: albumUrl },
    },
    ...(original && { isBasedOn: { "@type": "MusicAlbum", name: albumName(original), url: absoluteUrl(albumPath(original)) } }),
    ...(tracks.length > 0 && {
      numTracks: tracks.length,
      track: {
        "@type": "ItemList",
        numberOfItems: tracks.length,
        itemListElement: tracks.map((track, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: { "@type": "MusicRecording", name: track.name, duration: isoDuration(Math.round(track.duration_ms / 1000)), byArtist: TAYLOR_SWIFT },
        })),
      },
    }),
  } as const;
}

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
  const album = findAlbum(selected?.catalogueId);
  const version = album?.versions?.find(({ id }) => id === versionId);

  return (
    <>
      {album && <JsonLd data={musicAlbumData(album, version, details)} />}
      <MusicJournal albumId={selected?.id} details={details} links={albumLinks()} shelf={shelf} versionId={versionId} versions={versions} />
    </>
  );
}
