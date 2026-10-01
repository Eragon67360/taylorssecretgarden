import Image from "next/image";
import Link from "next/link";

import { Paper, Pin, Scribble, StickyNote } from "@/components/scrapbook";
import { cn } from "@/lib/utils";

import { SectionHead } from "./section-head";
import { WALL_TOURS } from "./tour-posters";

const PIN_COLOURS = ["#C8323C", "#3D6FB4", "#E1A628", "#7E4BB0", "#2E8B6E", "#D0598A"];
const TILTS = [-3, 2.5, -1.5, 3, -2.5, 1.5];

/** The bedroom wall: a poster of every Tour, pinned to kraft paper, each opening its Tour page. */
export function TourWall() {
  return (
    <Paper
      aria-labelledby="tour-wall"
      as="section"
      className="below-fold relative mt-16 w-full py-20 shadow-[inset_0_12px_16px_-12px_rgba(0,0,0,.25),inset_0_-12px_16px_-12px_rgba(0,0,0,.25)] [--fold-height:1820px] sm:[--fold-height:1300px] lg:[--fold-height:830px]"
      tone="kraft"
    >
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead id="tour-wall" kicker="page 4 · the tour wall" title="Posters from the bedroom wall" />
          <StickyNote attach="pin" className="w-[190px] text-[24px] leading-[1.05]" tilt={4}>
            <span className="text-pen">A lot</span> going on at the moment
          </StickyNote>
        </div>

        <ul className="mt-14 grid grid-cols-2 items-start gap-x-6 gap-y-12 sm:grid-cols-3 sm:gap-x-10 lg:grid-cols-6 lg:gap-x-6">
          {WALL_TOURS.map((tour, index) => (
            <li key={tour.slug} className={cn(index % 2 === 1 && "mt-8 lg:mt-10")}>
              <Link
                className="group focus-ring relative block rounded-[2px]"
                href={`/tours/${tour.slug}`}
                style={{ rotate: `${TILTS[index % TILTS.length]}deg` }}
              >
                <Pin className="-top-2 left-1/2 -translate-x-1/2" color={PIN_COLOURS[index % PIN_COLOURS.length]} />
                {/* The poster swings a little on its pin; its shadow deepens and its name underlines too, which reduced motion keeps. */}
                <div className="bg-photo origin-top p-1.5 shadow-[0_16px_24px_-14px_rgba(0,0,0,.6)] transition-[rotate,box-shadow] duration-300 ease-out group-hover:shadow-[0_20px_28px_-12px_rgba(0,0,0,.7)] motion-safe:group-hover:-rotate-2">
                  <Image
                    alt=""
                    className="aspect-[2/3] w-full object-cover"
                    height={330}
                    sizes="(min-width: 1024px) 180px, (min-width: 640px) 30vw, 45vw"
                    src={tour.poster}
                    width={220}
                  />
                </div>
                <div className="mt-3 px-1">
                  <p className="text-[11px] font-bold tracking-[.18em] text-soft uppercase">{tour.years}</p>
                  <p className="font-serif text-[18px] leading-tight font-semibold decoration-[1.5px] underline-offset-[3px] group-hover:underline">
                    {tour.name}
                  </p>
                  {tour.note && <p className="font-hand mt-0.5 text-[19px] leading-tight font-bold text-accent">{tour.note}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-14 flex justify-center">
          <Link className="font-hand focus-ring relative rounded-sm text-center text-[28px] font-bold" href="/tours">
            see every Tour, ticket stubs & all →
            <Scribble className="absolute -bottom-1 left-0 h-3 w-full" color="var(--pen)" />
          </Link>
        </div>
      </div>
    </Paper>
  );
}
