import "server-only";

import type { Metadata } from "next";
import type { AlbumDetails } from "@/types";

import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { notFound } from "next/navigation";

import { getShelf } from "@/components/music/catalogue";
import { formatReleaseDate } from "@/components/music/format";
import { JournalDetails } from "@/components/music/journal-details";
import { selectRelease } from "@/components/music/selection";
import { JsonLd, TAYLOR_SWIFT, isoDuration } from "@/components/json-ld";
import { type AlbumVersion, type CatalogueAlbum, CATALOGUE, albumName, albumYear, findRelease, originalOf, releaseName, versionKind } from "@/lib/catalogue";
import { absoluteUrl, albumPath, pageMetadata, versionPath } from "@/lib/metadata";
import { getAlbumDetails } from "@/service/deezer";

/*
  What the three Music pages share: /music (the first Album), /music/<album>
  and /music/<album>/<version>, each a release with its own title,
  description, canonical link and MusicAlbum data, prerendered and
  refreshed hourly from the day-long Deezer caches (app/music/layout.tsx).
*/

/** "Red tracklist (Taylor Swift)"; a Taylor's Version already says whose it is. */
const tracklistTitle = (name: string) => (name.includes("(Taylor's Version)") ? `${name} tracklist` : `${name} tracklist (Taylor Swift)`);

/**
 * A release page's metadata, from the catalogue alone (no Deezer call).
 * Descriptions answer first: the release, whose it is, when. /music is the
 * shelf as a whole, opening on the first Album.
 */
export function releaseMetadata(albumSlug?: string, versionSlug?: string): Metadata {
  const release = findRelease(albumSlug, versionSlug);

  if (!release) return {};
  const { album, version } = release;

  if (albumSlug === undefined) {
    return pageMetadata({
      title: "Taylor Swift's Albums and tracklists",
      description: `Taylor Swift's ${CATALOGUE.length} Albums in Era order, opening on her debut, ${album.title} (${formatReleaseDate(album.released)}): its tracklist, running times and song previews.`,
      path: "/music",
    });
  }
  const original = originalOf(album);
  const name = releaseName(album, version);
  let about = `${name}, Taylor Swift's ${albumYear(album)} Album, released ${formatReleaseDate(album.released)}${album.edition ? ` (${album.edition} shown)` : ""}`;

  if (version) about = `${name}, a Taylor Swift release of ${formatReleaseDate(version.released)}`;
  else if (original) about = `${name}, Taylor Swift's re-recording of ${albumName(original)}, released ${formatReleaseDate(album.released)}`;

  return pageMetadata({
    title: tracklistTitle(name),
    description: `${about}: every song with its running time, the label and 30-second previews.`,
    path: version ? versionPath(album, version) : albumPath(album),
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
  const url = version ? absoluteUrl(versionPath(album, version)) : albumUrl;
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
 * A release's details from Deezer. If Deezer fails while the site is being
 * built, the page is built without them (the facts and tracklist wait), not
 * the whole deployment failed; its hourly refresh tries again. If Deezer
 * fails a refresh, the error keeps the page Next already has, with its tracklist.
 */
async function releaseDetails(versionId: string): Promise<AlbumDetails | undefined> {
  try {
    return await getAlbumDetails(versionId);
  } catch (error) {
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw error;
    // eslint-disable-next-line no-console
    console.warn(`Music page ${versionId} built without its tracklist:`, error instanceof Error ? error.message : error);

    return undefined;
  }
}

/**
 * A release's page in the music journal (app/music/layout.tsx): its facts
 * and tracklist, fetched on the server (Deezer responses are cached, see
 * service/deezer.ts), and its MusicAlbum data.
 */
export async function ReleasePage({ slugs }: { slugs: string[] }) {
  const release = findRelease(slugs[0], slugs[1]);
  const selected = selectRelease(await getShelf(), slugs);

  if (!release || !selected) notFound();
  const details = await releaseDetails(selected.versionId);

  return (
    <>
      <JsonLd data={musicAlbumData(release.album, release.version, details)} />
      <JournalDetails albumId={selected.albumId} details={details} versionId={selected.versionId} />
    </>
  );
}
