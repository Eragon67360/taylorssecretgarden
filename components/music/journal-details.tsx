"use client";

import type { AlbumDetails } from "@/types";

import Link from "next/link";

import { DeezerLogo } from "@/components/deezer-logo";

import { AlbumVersions } from "./album-versions";
import { formatReleaseDate, formatRunningTime } from "./format";
import { useJournal } from "./music-journal";
import { Tracklist } from "./tracklist";

type JournalDetailsProps = {
  /** The shelf Album this page opens. */
  albumId: string;
  /** The version whose tracklist it shows (the shelf Album's own ID for its shelf edition). */
  versionId: string;
  /** That version's details, fetched on the server; none when Deezer failed. */
  details: AlbumDetails | undefined;
};

/**
 * The open page's part of the music journal's right page, under the title:
 * the release's facts, its links, its versions and its tracklist with
 * previews. When another Album or version is picked, its page is on its way:
 * the facts and tracklist wait for it rather than show this one's.
 */
export function JournalDetails({ albumId, versionId, details }: JournalDetailsProps) {
  const { selection, album, version, versions, links, player, selectVersion, claimVersionFocus } = useJournal();
  const ready = !!details && albumId === selection?.albumId && versionId === selection.versionId;
  const tracks = ready ? details.tracks.items : undefined;

  return (
    <div aria-busy={!ready}>
      <dl className="border-line mt-7 grid max-w-[640px] grid-cols-2 gap-x-6 gap-y-3 border-y py-4 text-[15px] sm:grid-cols-[1.5fr_.6fr_1fr_1fr]">
        {[
          ["Released", album ? formatReleaseDate(version?.released ?? album.released) : "…"],
          ["Songs", tracks ? String(tracks.length) : "…"],
          ["Running time", tracks ? formatRunningTime(tracks.reduce((total, track) => total + track.duration_ms, 0)) : "…"],
          ["Label", ready ? details.label || "n/a" : "…"],
        ].map(([term, value]) => (
          <div key={term} className="min-w-0">
            <dt className="text-soft text-[10.5px] font-bold tracking-[.2em] uppercase">{term}</dt>
            <dd className="mt-0.5 font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {album && links.length > 0 && (
        <ul aria-label={`More about ${album.name}`} className="font-hand mt-4 flex max-w-[640px] flex-wrap gap-x-6 gap-y-1 text-[21px] leading-tight font-bold">
          {links.map(({ lead, href, text }) => (
            <li key={href}>
              <span className="text-soft">{lead}</span>{" "}
              <Link className="focus-ring text-ink rounded-sm underline decoration-1 underline-offset-4 hover:decoration-2" href={href}>
                {text}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {album && versions.length > 0 && (
        <AlbumVersions claimFocus={claimVersionFocus} selectedId={selection?.versionId} title={album.name} versions={versions} onSelect={selectVersion} />
      )}

      <div className="mt-10">
        <Tracklist player={player} tracks={tracks} />
        {/* Where the previews play, Deezer's logo and their terms (components/deezer-logo.tsx). */}
        <p className="text-soft mt-4 text-[13px]">
          Covers and 30-second previews from{" "}
          <a className="text-ink focus-ring rounded-sm font-semibold underline underline-offset-2" href="https://www.deezer.com/">
            <DeezerLogo />
          </a>
          , for private listening only.
        </p>
      </div>
    </div>
  );
}
