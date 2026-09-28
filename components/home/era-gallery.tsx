import type { EraAlbum } from "./era-albums";

import Image from "next/image";
import Link from "next/link";

import { EraScope } from "@/components/era-scope";
import { PressedFlower, WashiTape } from "@/components/scrapbook";
import { ERAS, type EraLook, type EraSlug } from "@/lib/eras";
import { cn } from "@/lib/utils";

import { EraFace } from "./era-face";
import { SectionHead } from "./section-head";

// A hand-placed tilt per pressed page.
const TILTS = [-2, 1.5, -1, 2.2, -1.8, 1, -2.4, 1.8, -1.2, 2, -1.6];

/** How the Era is written on its pressed page: the debut by its title, TTPD by its initials. */
const label = (look: EraLook) => (look.slug === "ttpd" ? look.short : look.name);

/** The herbarium: all eleven Eras pressed in their own paper, each opening its Album on the Music page. */
export function EraGallery({ albums }: { albums: Record<EraSlug, EraAlbum> }) {
  return (
    <section aria-labelledby="eras" className="relative mx-auto w-full max-w-[1240px] px-4 pt-20 pb-10 sm:px-8">
      <SectionHead aside="tap one to open its Album" id="eras" kicker="page 3 · the herbarium" title="Every Era, pressed and kept" />

      <ol className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-7 lg:gap-y-10">
        {ERAS.map((look, index) => (
          <li key={look.slug}>
            <PressedEra album={albums[look.slug]} look={look} number={index + 1} tilt={TILTS[index % TILTS.length]} />
          </li>
        ))}
        <li className="flex">
          <div className="border-line text-soft relative flex w-full rotate-[1.5deg] flex-col items-center justify-center border-2 border-dashed p-5 text-center">
            <p className="font-hand text-[22px] leading-snug font-bold">space saved for whatever she announces at midnight</p>
            <p className="mt-3 text-[11px] font-bold tracking-[.2em] uppercase">No. 12 · soon™</p>
          </div>
        </li>
      </ol>
    </section>
  );
}

function PressedEra({ look, album, number, tilt }: { look: EraLook; album: EraAlbum; number: number; tilt: number }) {
  return (
    <Link
      className={cn(
        "group focus-ring relative block h-full rounded-[2px]",
        "transition-[translate,rotate] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-safe:hover:-translate-y-1.5 motion-safe:hover:rotate-0!",
      )}
      href={`/music?album=${album.id}`}
      style={{ rotate: `${tilt}deg` }}
    >
      <EraScope
        className={cn(
          "relative h-full p-3 pb-4 sm:p-4",
          "shadow-[0_1px_1px_rgba(0,0,0,.08),0_14px_22px_-14px_rgba(40,20,10,.55)] transition-shadow duration-300 group-hover:shadow-[0_1px_1px_rgba(0,0,0,.08),0_22px_30px_-14px_rgba(40,20,10,.55)]",
        )}
        era={look.slug}
      >
        <WashiTape className="-top-3 left-1/2 -translate-x-1/2" rotate={tilt * -1.5} width={70} />
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden">
          <PressedFlower
            className="h-[88%] w-auto transition-transform duration-500 ease-out motion-safe:group-hover:scale-105 motion-safe:group-hover:rotate-6"
            kind={look.flower}
          />
          {album.cover && (
            <div className="bg-photo absolute right-0 bottom-1 w-[46%] rotate-[5deg] p-1 shadow-[0_4px_8px_-3px_rgba(0,0,0,.5)] transition-transform duration-300 ease-out motion-safe:group-hover:-rotate-2">
              <div className="relative aspect-square">
                <Image fill alt="" className="object-cover" sizes="(min-width: 1024px) 120px, 22vw" src={album.cover} />
              </div>
            </div>
          )}
        </div>
        <div className="border-line text-soft mt-2 flex items-baseline justify-between gap-2 border-t pt-2 text-[10.5px] font-bold tracking-[.18em] uppercase">
          <span>No. {String(number).padStart(2, "0")}</span>
          <span>{look.year}</span>
        </div>
        <p className="mt-1.5 truncate text-[clamp(1.35rem,2.6vw,1.9rem)] leading-tight">
          <EraFace>{label(look)}</EraFace>
        </p>
        {album.taylorsVersion && (
          <p className="font-hand text-soft text-[17px] leading-none font-bold">
            (Taylor&apos;s Version) <span aria-hidden="true">✓</span>
          </p>
        )}
      </EraScope>
    </Link>
  );
}
