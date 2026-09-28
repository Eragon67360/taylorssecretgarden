"use client";

import type { ShelfAlbum } from "./catalogue";
import type { AlbumDetails } from "@/types";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useOptimistic, useTransition } from "react";

import { EraScope } from "@/components/era-scope";
import { Bracelet, Highlight, Polaroid, PressedFlower, StickyNote } from "@/components/scrapbook";
import { ERA_LOOKS, ERA_SLUGS, isTaylorsVersion } from "@/lib/eras";

import { AlbumShelf } from "./album-shelf";
import { formatReleaseDate, formatRunningTime, shortTitle } from "./format";
import { Tracklist } from "./tracklist";
import { usePreviewPlayer } from "./use-preview-player";

type MusicJournalProps = {
  shelf: ShelfAlbum[];
  /** The selected Album (from `?album`), fetched on the server. */
  details: AlbumDetails | undefined;
};

/**
 * The music journal: a shelf of Album polaroids over a two-page spread for
 * the selected Album, the whole page dressed in that Album's Era. Selecting
 * an Album re-themes the page at once; its details follow from the server.
 */
export function MusicJournal({ shelf, details }: MusicJournalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useOptimistic(details?.id);
  const player = usePreviewPlayer();
  const { stop } = player;

  const album = shelf.find(({ id }) => id === selectedId) ?? shelf[0];
  const era = album?.era ?? "debut";
  const look = ERA_LOOKS[era];
  const ready = !!details && details.id === selectedId;
  const tracks = ready ? details.tracks.items : undefined;

  // A new Album: whatever was playing stops.
  useEffect(() => stop(), [selectedId, stop]);

  const select = (next: ShelfAlbum) => {
    if (next.id === selectedId) return;
    startTransition(() => {
      setSelectedId(next.id);
      router.push(`/music?album=${next.id}`, { scroll: false });
    });
  };

  const title = shortTitle(album?.name ?? look.name);
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
                <motion.div
                  key={album?.id}
                  animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                  className="relative mx-auto w-[88%]"
                  exit={{ opacity: 0, x: 40, rotate: 6, transition: { duration: 0.18 } }}
                  initial={{ opacity: 0, y: -18, rotate: -6, scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 170, damping: 18 }}
                >
                  <Polaroid taped caption={`${title.toLowerCase()}, ${look.year}`} tilt={-2.5}>
                    {album && (
                      <Image
                        priority
                        alt={`${album.name} Album cover`}
                        className="aspect-square object-cover"
                        height={440}
                        sizes="(min-width: 1024px) 400px, 80vw"
                        src={album.images[0].url}
                        width={440}
                      />
                    )}
                  </Polaroid>
                </motion.div>
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
          </h2>
          {album && isTaylorsVersion(album.name) && (
            <p className="font-hand mt-1 inline-block -rotate-2 text-[26px] font-bold">
              <Highlight>(Taylor&apos;s Version)</Highlight> <span className="text-soft">the one we stream</span>
            </p>
          )}
          {album && /deluxe/i.test(album.name) && (
            <p className="font-hand text-soft mt-1 inline-block -rotate-2 text-[26px] font-bold">deluxe edition, the one with the bonus tracks</p>
          )}

          <dl className="border-line mt-7 grid max-w-[640px] grid-cols-2 gap-x-6 gap-y-3 border-y py-4 text-[15px] sm:grid-cols-[1.5fr_.6fr_1fr_1fr]">
            {[
              ["Released", ready ? formatReleaseDate(details.release_date) : "…"],
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
