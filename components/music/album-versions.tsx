"use client";

import type { AlbumVersionCard } from "./catalogue";

import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type AlbumVersionsProps = {
  /** The open Album's title, naming the list. */
  title: string;
  versions: AlbumVersionCard[];
  selectedId: string | undefined;
  onSelect: (version: AlbumVersionCard) => void;
};

/**
 * Every version of the open Album (its editions, live and acoustic albums,
 * "Chapter" compilations) as small cover clippings. Each links to its own
 * page (`?album=<version id>`); followed in the same tab, it switches the
 * tracklist in place, like the shelf.
 */
export function AlbumVersions({ title, versions, selectedId, onSelect }: AlbumVersionsProps) {
  return (
    <div className="mt-6 max-w-[640px]">
      <p className="font-hand text-soft text-[22px] leading-tight font-bold">
        every version ({versions.length})
      </p>
      <ul aria-label={`Versions of ${title}`} className="mt-2 flex flex-wrap gap-2.5">
        {versions.map((version) => {
          const active = version.id === selectedId;

          return (
            <li key={version.id} className="min-w-0">
              <Link
                aria-current={active ? "true" : undefined}
                className={cn(
                  "bg-card text-ink focus-ring relative flex max-w-[17rem] min-w-0 items-center gap-2.5 rounded-[3px] p-1 pr-3 text-left",
                  "shadow-[0_1px_1px_rgba(0,0,0,.1),0_6px_12px_-8px_rgba(0,0,0,.5)] motion-safe:transition-transform motion-safe:duration-200",
                  // The open one: an ink outline (the Era accent is too faint on some papers) and a tick, not colour alone.
                  active ? "outline-ink outline-2 outline-offset-1" : "motion-safe:hover:-translate-y-0.5",
                )}
                href={`/music?album=${version.id}`}
                scroll={false}
                onNavigate={(event) => {
                  event.preventDefault();
                  onSelect(version);
                }}
              >
                <Image alt="" className="size-11 shrink-0 object-cover" height={44} sizes="44px" src={version.cover} width={44} />
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-[14px] leading-tight font-bold">{version.name}</span>
                  <span className="text-soft block text-[12.5px] leading-tight">{version.released.slice(0, 4)}</span>
                </span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="bg-ink text-card absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full text-[12px] leading-none font-bold"
                    data-selected-mark=""
                  >
                    ✓
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
