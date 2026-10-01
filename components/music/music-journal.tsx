"use client";

import type { AlbumVersionCard, ShelfAlbum } from "./catalogue";
import type { PreviewPlayer } from "./use-preview-player";

import Image from "next/image";
import { useRouter, useSelectedLayoutSegments } from "next/navigation";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { type ReactNode, createContext, use, useCallback, useEffect, useOptimistic, useRef, useTransition } from "react";

import { EraScope } from "@/components/era-scope";
import { Bracelet, Highlight, Polaroid, PressedFlower, StickyNote } from "@/components/scrapbook";
import { ERA_LOOKS, ERA_SLUGS } from "@/lib/eras";

import { AlbumShelf } from "./album-shelf";
import { type Selection, selectRelease } from "./selection";
import { usePreviewPlayer } from "./use-preview-player";

type MusicJournalProps = {
  shelf: ShelfAlbum[];
  /** Every Album's versions, the shelf edition first, by catalogue ID; empty when it has only one. */
  versions: Record<string, AlbumVersionCard[]>;
  /** Each Album's links to its original or Taylor's Version and its Era's Tour, by catalogue ID. */
  links: Record<string, AlbumLink[]>;
  /** The open page's details and tracklist (JournalDetails). */
  children: ReactNode;
};

/** A link from an Album's page: "a re-recording of" + "Fearless (2008)". */
export type AlbumLink = { lead: string; href: string; text: string };

/** What the journal shares with the page open in it (JournalDetails). */
type Journal = {
  /** The Album and version selected: at once on a click, before their page arrives. */
  selection: Selection | undefined;
  album: ShelfAlbum | undefined;
  /** The version open, when it is not the shelf's own edition. */
  version: AlbumVersionCard | undefined;
  /** The selected Album's versions; empty when it has only one, or Deezer failed them. */
  versions: AlbumVersionCard[];
  links: AlbumLink[];
  player: PreviewPlayer;
  selectVersion: (version: AlbumVersionCard) => void;
  /** Whether a version was just picked from the list: the new page's list then takes the focus back. */
  claimVersionFocus: () => boolean;
};

const JournalContext = createContext<Journal | null>(null);

/** The music journal around the open page (components/music/journal-details.tsx). */
export function useJournal(): Journal {
  const journal = use(JournalContext);

  if (!journal) throw new Error("useJournal outside the music journal");

  return journal;
}

/**
 * The music journal, Music's layout: a shelf of Album polaroids over a
 * two-page spread for the selected Album, the whole page dressed in that
 * Album's Era. The page open (/music, /music/<album>, /music/<album>/<version>)
 * fills in the details and the tracklist; the journal stays, so selecting an
 * Album dresses the page in its Era's look at once, its cover swings in and
 * its colours fade while its page follows from the server, as one smooth move.
 * Under the Album's title, its other versions switch the tracklist the same way.
 */
export function MusicJournal({ shelf, versions, links, children }: MusicJournalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // The address says what is open; a click says it first.
  const segments = useSelectedLayoutSegments();
  const release = selectRelease(shelf, segments);
  const [selection, setSelection] = useOptimistic<Selection | undefined>(release && { albumId: release.albumId, versionId: release.versionId });
  const player = usePreviewPlayer();
  const { stop } = player;
  const versionFocus = useRef(false);

  const album = shelf.find(({ id }) => id === selection?.albumId) ?? shelf[0];
  const selectedVersionId = selection?.versionId ?? album?.id;
  const era = album?.era ?? "debut";
  const look = ERA_LOOKS[era];
  const albumVersions = (album && versions[album.catalogueId]) ?? [];
  const version = selectedVersionId !== album?.id ? albumVersions.find(({ id }) => id === selectedVersionId) : undefined;
  // None when Deezer failed the Album (components/music/catalogue.ts): the polaroid stays blank.
  const cover = version?.cover ?? album?.images[0]?.url;

  // Another Album or version: whatever was playing stops.
  useEffect(() => stop(), [selectedVersionId, stop]);

  // The URL is the page's canonical one (from the catalogue), never the ID Deezer answered with.
  const open = ({ path, ...next }: Selection & { path: string }) => {
    if (next.versionId === selectedVersionId) return;
    startTransition(() => {
      setSelection(next);
      router.push(path, { scroll: false });
    });
  };
  const select = (next: ShelfAlbum) => {
    versionFocus.current = false;
    open({ albumId: next.id, versionId: next.id, path: next.path });
  };
  const selectVersion = (next: AlbumVersionCard) => {
    if (!album || next.id === selectedVersionId) return;
    versionFocus.current = true;
    open({ albumId: album.id, versionId: next.id, path: next.path });
  };
  const claimVersionFocus = useCallback(() => {
    const claimed = versionFocus.current;

    versionFocus.current = false;

    return claimed;
  }, []);

  const title = album?.title ?? look.name;
  // "(Taylor's Version), Deluxe Edition": what the h2 adds to the title, unseen.
  const fullNameSuffix =
    album && `${album.taylorsVersion ? " (Taylor's Version)" : ""}${version || album.edition ? `, ${version?.name ?? album.edition}` : ""}`;
  const eraNumber = String(ERA_SLUGS.indexOf(era) + 1).padStart(2, "0");
  const braceletWord = look.short === "rep" ? look.name : look.short;
  const journal: Journal = {
    selection: album && { albumId: album.id, versionId: selectedVersionId! },
    album,
    version,
    versions: albumVersions,
    links: (album && links[album.catalogueId]) ?? [],
    player,
    selectVersion,
    claimVersionFocus,
  };

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
          <p className="font-hand text-soft -rotate-[1.5deg] text-[21px] font-bold">{shelf.length} Albums, in Era order (we&apos;re not animals)</p>
        </div>

        <AlbumShelf albums={shelf} selectedId={album?.id} onSelect={select} />
      </section>

      <JournalContext value={journal}>
        <section
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

          {/* Right page: the title, then the open page's facts and tracklist. */}
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

            {children}

            {/* The page's one player: one preview at a time. */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- 30-second music previews have no captions */}
            <audio {...player.audioProps} />
          </div>
        </section>
      </JournalContext>
    </EraScope>
  );
}
