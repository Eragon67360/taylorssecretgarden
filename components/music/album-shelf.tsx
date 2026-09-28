"use client";

import type { ShelfAlbum } from "./catalogue";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { Pin } from "@/components/scrapbook";
import { ERA_LOOKS } from "@/lib/eras";
import { cn } from "@/lib/utils";

/** Each polaroid's resting tilt, in shelf order. */
const TILTS = [-3, 2, -1.5, 3, -2.5, 1.5, -2, 2.5, -1, 3, -2.5];

type AlbumShelfProps = {
  albums: ShelfAlbum[];
  selectedId: string | undefined;
  onSelect: (album: ShelfAlbum) => void;
};

/**
 * Every Album as a polaroid on a shelf: one row that scrolls (and snaps)
 * sideways on small screens. Each polaroid links to its Album's page
 * (`?album=<id>`); followed in the same tab, it selects the Album in place.
 */
export function AlbumShelf({ albums, selectedId, onSelect }: AlbumShelfProps) {
  const scroller = useRef<HTMLDivElement>(null);

  // Bring the selected polaroid into view when the page opens on it (a deep
  // link to a late Era, on a phone), without scrolling the page itself.
  useEffect(() => {
    const row = scroller.current;
    const selected = row?.querySelector<HTMLElement>("[aria-current=true]")?.parentElement;

    if (!row || !selected || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft = selected.offsetLeft - (row.clientWidth - selected.offsetWidth) / 2;
  }, []);

  return (
    <div
      ref={scroller}
      className="relative -mx-4 mt-2 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pt-5 pb-6 [scrollbar-width:thin] sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0"
    >
      <ul aria-label="Albums" className="flex w-max gap-3.5 lg:grid lg:w-full lg:grid-cols-11 lg:gap-2.5">
        {albums.map((album, index) => {
          const look = ERA_LOOKS[album.era];
          const active = album.id === selectedId;

          return (
            <li key={album.id} className="relative snap-center">
              <Link
                aria-current={active ? "true" : undefined}
                aria-label={album.name}
                className={cn(
                  "bg-photo focus-ring relative block w-[96px] p-1.5 pb-0 lg:w-full",
                  "shadow-[0_1px_1px_rgba(0,0,0,.1),0_10px_16px_-10px_rgba(0,0,0,.55)]",
                  "motion-safe:transition-[translate,scale,rotate,box-shadow] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(.2,.9,.3,1.25)]",
                  active
                    ? "z-10 -translate-y-2 scale-[1.06] shadow-[0_1px_1px_rgba(0,0,0,.1),0_18px_26px_-12px_rgba(0,0,0,.6)]"
                    : "motion-safe:hover:-translate-y-1.5 motion-safe:hover:rotate-0!",
                )}
                href={`/music?album=${album.id}`}
                scroll={false}
                style={{ rotate: active ? "0deg" : `${TILTS[index % TILTS.length]}deg` }}
                onNavigate={(event) => {
                  // Select in place; the URL and the details follow.
                  event.preventDefault();
                  onSelect(album);
                }}
              >
                {active && <Pin className="-top-2 left-1/2 -translate-x-1/2" />}
                <Image
                  alt=""
                  className="aspect-square w-full object-cover"
                  height={120}
                  sizes="(min-width: 1024px) 110px, 96px"
                  src={album.images[0].url}
                  width={120}
                />
                <span aria-hidden="true" className="font-hand block truncate py-1 text-center text-[17px] leading-tight font-bold text-[var(--photo-ink)]">
                  {look.short}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
