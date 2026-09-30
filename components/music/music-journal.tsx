"use client";

import type { AlbumVersionCard, ShelfAlbum } from "./catalogue";
import type { AlbumDetails } from "@/types";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useOptimistic, useTransition } from "react";

import { EraScope } from "@/components/era-scope";
import { Bracelet, Highlight, Polaroid, PressedFlower, StickyNote } from "@/components/scrapbook";
import { ERA_LOOKS, ERA_SLUGS } from "@/lib/eras";

import { AlbumShelf } from "./album-shelf";
import { AlbumVersions } from "./album-versions";
import { formatReleaseDate, formatRunningTime } from "./format";
import { Tracklist } from "./tracklist";
import { usePreviewPlayer } from "./use-preview-player";

type MusicJournalProps = {
  shelf: ShelfAlbum[];
  /** The shelf Album selected by `?album`. */
  albumId: string | undefined;
  /** The version of it `?album` asks for (the shelf Album's own ID for the shelf edition). */
  versionId: string | undefined;
  /** Every version of the selected Album, the shelf edition first; empty when it has only one. */
  versions: AlbumVersionCard[];
  /** The version's details, fetched on the server. */
  details: AlbumDetails | undefined;
  /** Each Album's links to its original or Taylor's Version and its Era's Tour, by catalogue ID. */
  links: Record<string, AlbumLink[]>;
};

/** A link from an Album's page: "a re-recording of" + "Fearless (2008)". */
export type AlbumLink = { lead: string; href: string; text: string };

/**
 * The music journal: a shelf of Album polaroids over a two-page spread for
 * the selected Album, the whole page dressed in that Album's Era. Selecting
 * an Album dresses the page in its Era's look at once; its details follow
 * from the server. Under the Album's title, its other versions switch the
 * tracklist the same way.
 */
export function MusicJournal({ shelf, albumId, versionId, versions, details, links }: MusicJournalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selection, setSelection] = useOptimistic({ albumId, versionId });
  const { albumId: selectedId, versionId: selectedVersionId } = selection;
  const player = usePreviewPlayer();
  const { stop } = player;

  const album = shelf.find(({ id }) => id === selectedId) ?? shelf[0];
  const era = album?.era ?? "debut";
  const look = ERA_LOOKS[era];
  // The details and versions are the server's: stale while others are on their way.
  const ready = !!details && albumId === selectedId && versionId === selectedVersionId;
  const tracks = ready ? details.tracks.items : undefined;
  const shownVersions = albumId === selectedId ? versions : [];
  // The version open, when it is not the shelf's own edition.
  const version = selectedVersionId !== album?.id ? shownVersions.find(({ id }) => id === selectedVersionId) : undefined;
  // None when Deezer failed the Album (components/music/catalogue.ts): the polaroid stays blank.
  const cover = version?.cover ?? album?.images[0]?.url;

  // Another Album or version: whatever was playing stops.
  useEffect(() => stop(), [selectedVersionId, stop]);

  // The URL is the page's canonical one (from the catalogue), never the ID Deezer answered with.
  const open = ({ path, ...next }: { albumId: string; versionId: string; path: string }) => {
    if (next.versionId === selectedVersionId) return;
    startTransition(() => {
      setSelection(next);
      router.push(path, { scroll: false });
    });
  };
  const select = (next: ShelfAlbum) => open({ albumId: next.id, versionId: next.id, path: next.path });
  const selectVersion = (next: AlbumVersionCard) => album && open({ albumId: album.id, versionId: next.id, path: next.path });

  const title = album?.title ?? look.name;
  // "(Taylor's Version), Deluxe Edition": what the h2 adds to the title, unseen.
  const fullNameSuffix = album && `${album.taylorsVersion ? " (Taylor's Version)" : ""}${version || album.edition ? `, ${version?.name ?? album.edition}` : ""}`;
  const eraNumber = String(ERA_SLUGS.indexOf(era) + 1).padStart(2, "0");
  const braceletWord = look.short === "rep" ? look.name : look.short;

  return (
    <EraScope className="overflow-x-clip pb-20" era={era}>
      <section aria-labelledby="music-title" className="relative mx-auto w-full max-w-[1240px] px-4 pt-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <div>
            <p className="text-soft text-[11px] font-bold tracking-[.26em] uppercase">The music journal</p>
            <h1 className="font-hand mt-1 text-[clamp(2rem,4.4vw,2.9rem)] leading-none font-bold" id="music-title">
              pick an Era. the page changes outfits.
            </h1>
          </div>
          <p className="font-hand text-soft -rotate-[1.5deg] text-[21px] font-bold">
            {shelf.length} Albums, in Era order (we&apos;re not animals)
          </p>
        </div>

        <AlbumShelf albums={shelf} selectedId={selectedId} onSelect={select} />
      </section>

      <section
        aria-busy={!ready}
        aria-label={`${title}, the selected Album`}
        className="relative mx-auto mt-8 grid w-full max-w-[1240px] gap-x-12 gap-y-14 px-4 sm:px-8 lg:mt-10 lg:grid-cols-12"
      >
        {/* Left page: the cover, the Era in beads, the fan note. */}
        <div className="relative lg:col-span-5">
          <div className="lg:sticky lg:top-8">
            <div className="relative mx-auto w-full max-w-[440px] pt-4">
              <PressedFlower
                className="absolute -top-4 -right-2 h-52 w-28 rotate-[22deg] sm:-right-10 sm:h-64 sm:w-36"
                kind={look.flower}
                style={{ opacity: look.dark ? 0.8 : 1 }}
              />
              <AnimatePresence initial={false} mode="wait">
                <m.div
                  key={selectedVersionId}
                  animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                  className="relative mx-auto w-[88%]"
                  exit={{ opacity: 0, x: 40, rotate: 6, transition: { duration: 0.18 } }}
                  initial={{ opacity: 0, y: -18, rotate: -6, scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 170, damping: 18 }}
                >
                  <Polaroid taped caption={`${title.toLowerCase()}, ${album?.year ?? look.year}`} tilt={-2.5}>
                    {album && !cover && <span aria-hidden="true" className="bg-line block aspect-square w-full" />}
                    {album && cover && (
                      <Image
                        priority
                        alt={`${album.name}${version ? `, ${version.name},` : ""} Album cover`}
                        className="aspect-square object-cover"
                        height={440}
                        quality={60}
                        sizes="(min-width: 1024px) 400px, 80vw"
                        src={cover}
                        width={440}
                      />
                    )}
                  </Polaroid>
                </m.div>
              </AnimatePresence>
            </div>

            <div className="mt-8 flex justify-center">
              <Bracelet beads="era" className="-rotate-2" word={braceletWord} />
            </div>

            <StickyNote attach="tape" className="mx-auto mt-10 w-[86%] max-w-[360px]" tilt={1.5} tone="era">
              <span className="font-body block text-[10.5px] font-bold tracking-[.22em] uppercase">fan note</span>
              <span className="mt-1 block text-[25px]">{look.note}</span>
            </StickyNote>
          </div>
        </div>

        {/* Right page: the title, the facts, the tracklist. */}
        <div className="relative min-w-0 lg:col-span-7">
          <p className="text-soft text-[11px] font-bold tracking-[.26em] uppercase">
            Era No. {eraNumber} · {look.year}
          </p>
          <h2 className={title.length > 18 ? "font-display mt-2 text-[clamp(2rem,4.6vw,3.6rem)] leading-[1.05] break-words" : "font-display mt-2 text-[clamp(2.5rem,6.5vw,5.2rem)] leading-[1.02] break-words"}>
            {title}
            {/* The release's full name, for search results and screen readers; the handwritten line below shows it. */}
            {album && fullNameSuffix && <span className="sr-only">{fullNameSuffix}</span>}
          </h2>
          {(album?.taylorsVersion || album?.edition || version) && (
            <div className="font-hand mt-1 flex -rotate-2 flex-wrap items-baseline gap-x-5 text-[26px] leading-tight font-bold">
              {album.taylorsVersion && (
                <p>
                  <Highlight>(Taylor&apos;s Version)</Highlight> <span className="text-soft">the one we stream</span>
                </p>
              )}
              {version ? (
                <p className="text-ink">{version.name}</p>
              ) : (
                album.edition && (
                  <p className="text-soft">
                    <span className="text-ink">{album.edition}</span>, every last bonus track
                  </p>
                )
              )}
            </div>
          )}

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

          {album && (links[album.catalogueId]?.length ?? 0) > 0 && (
            <ul aria-label={`More about ${album.name}`} className="font-hand mt-4 flex max-w-[640px] flex-wrap gap-x-6 gap-y-1 text-[21px] leading-tight font-bold">
              {links[album.catalogueId].map(({ lead, href, text }) => (
                <li key={href}>
                  <span className="text-soft">{lead}</span>{" "}
                  <Link className="focus-ring text-ink rounded-sm underline decoration-1 underline-offset-4 hover:decoration-2" href={href}>
                    {text}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {album && shownVersions.length > 0 && (
            <AlbumVersions selectedId={selectedVersionId} title={album.name} versions={shownVersions} onSelect={selectVersion} />
          )}

          <div className="mt-10">
            <Tracklist player={player} tracks={tracks} />
          </div>
          {/* The page's one player: one preview at a time. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- 30-second music previews have no captions */}
          <audio {...player.audioProps} />
        </div>
      </section>
    </EraScope>
  );
}
