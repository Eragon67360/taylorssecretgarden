import type { CSSProperties, ReactNode } from "react";
import type { EraAlbum } from "./era-albums";

import Image from "next/image";
import Link from "next/link";

import { Paper, Pin, TicketStub, WashiTape } from "@/components/scrapbook";
import { CATALOGUE } from "@/lib/catalogue";
import { ERAS } from "@/lib/eras";
import { cn } from "@/lib/utils";

import styles from "./home.module.css";
import { SectionHead } from "./section-head";
import { WALL_TOURS, tourPoster } from "./tour-posters";

/** Three ways into the garden: an envelope of Album covers (Music), a ticket stub (Tours), a passed note (Swiftter). */
export function WaysIn({ covers }: { covers: EraAlbum[] }) {
  return (
    <section aria-labelledby="ways-in" className="relative mx-auto w-full max-w-[1240px] px-4 pt-16 pb-8 sm:px-8">
      <SectionHead id="ways-in" kicker="page 2 · table of contents" title="Three ways into the garden" />

      <ul className="mt-12 grid gap-14 md:grid-cols-3 md:gap-8">
        <WayIn cta="read it" href="/music" object={<Envelope covers={covers} />} title="The music journal">
          Every Album, every tracklist, 30-second previews. Each Era re-colours the page, the way it should.
        </WayIn>
        <WayIn cta="grab a ticket" href="/tours" object={<Ticket />} title="The Tours">
          From the Fearless sparkles to three and a half hours of Eras. {WALL_TOURS.length} posters, one Ticketmaster meltdown.
        </WayIn>
        <WayIn cta="pass a note" href="/swiftter" object={<PassedNote />} title="Swiftter">
          The fan feed. Theories, easter eggs, 3am thoughts. Be kind, or at least be reputation about it.
        </WayIn>
      </ul>
    </section>
  );
}

/**
 * One way in: the object, then its title (the link, stretched over the whole
 * card so the object is clickable too) and a line about it. Hovering or
 * focusing anywhere on the card plays with the object.
 */
function WayIn({ href, title, cta, object, children }: { href: string; title: string; cta: string; object: ReactNode; children: ReactNode }) {
  return (
    <li className="group relative mx-auto w-full max-w-[340px]">
      <div className="relative h-[250px]">{object}</div>
      <h3 className="font-serif mt-4 text-[28px] leading-tight font-semibold">
        <Link
          className="rounded-sm outline-none after:absolute after:-inset-3 after:rounded-md focus-visible:after:outline-[2.5px] focus-visible:after:outline-offset-2 focus-visible:after:outline-[var(--ink)] focus-visible:after:outline-solid"
          href={href}
        >
          {title}
        </Link>
      </h3>
      <p className="text-soft mt-2 text-[16px] leading-relaxed">{children}</p>
      <p aria-hidden="true" className="font-hand text-accent mt-2 inline-flex items-center gap-1 text-[24px] font-bold">
        {cta}
        <span className="transition-transform duration-200 ease-out motion-safe:group-hover:translate-x-1.5">→</span>
      </p>
    </li>
  );
}

/** A kraft envelope with four Album covers fanned out of it. */
function Envelope({ covers }: { covers: EraAlbum[] }) {
  const flap = "[clip-path:polygon(0_18%,50%_52%,100%_18%,100%_100%,0_100%)]";

  return (
    <div aria-hidden="true" className="absolute inset-0">
      <div className="absolute inset-x-6 bottom-[84px] flex justify-center">
        {covers.map((album, index) => (
          <div
            key={album.id}
            className={cn(styles.cover, "bg-photo absolute bottom-0 w-[112px] p-1.5 shadow-[0_6px_12px_-6px_rgba(0,0,0,.45)]")}
            style={{ "--x": `${(index - 1.5) * 44}px`, "--r": `${(index - 1.5) * 9}deg`, zIndex: index } as CSSProperties}
          >
            <div className="relative aspect-square bg-[#e8dcc8]">
              {album.cover && <Image fill alt="" className="object-cover" sizes="100px" src={album.cover} />}
            </div>
          </div>
        ))}
      </div>
      <Paper
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 h-[150px] shadow-[0_10px_20px_rgba(0,0,0,.2)] transition-transform duration-300 ease-out motion-safe:group-hover:translate-y-2",
          flap,
        )}
        tone="kraft"
      >
        <span className="font-hand absolute inset-x-0 bottom-5 text-center text-2xl font-bold">{ERAS.length} Eras, {CATALOGUE.length} Albums inside ✿</span>
      </Paper>
    </div>
  );
}

const ERAS_TOUR = WALL_TOURS.find(({ slug }) => slug === "the-eras-tour") ?? WALL_TOURS[0];

/** A ticket stub for the Eras Tour, pinned to the page. */
function Ticket() {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
      <div className="w-full transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.02] motion-safe:group-hover:rotate-3">
        <TicketStub
          kicker="Admit one · floor"
          meta="SEC 13 · ROW 13 · SEAT 13"
          picture={
            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary resizes and encodes it (tour-posters.ts)
            <img alt="" decoding="async" height={150} loading="lazy" src={tourPoster(ERAS_TOUR.poster, 200)} width={100} />
          }
          tilt={-4}
          title={<span className="text-accent">The Tours</span>}
        />
      </div>
      <Pin className="top-[42px] left-[36%]" color="#3D6FB4" />
    </div>
  );
}

/** A note folded out of a lined exercise book, taped down. */
function PassedNote() {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
      <div
        className={cn(
          "relative h-[200px] w-[86%] rotate-[3deg] bg-[#fffefa] px-6 pt-5 pb-4 shadow-[0_12px_22px_-10px_rgba(0,0,0,.4)]",
          "bg-[linear-gradient(90deg,transparent_0_30px,#e7a0a0_30px_31.5px,transparent_31.5px),repeating-linear-gradient(180deg,transparent_0_27px,#bcd3e6_27px_28px)]",
          "[clip-path:polygon(0_0,100%_0,100%_84%,86%_100%,0_100%)]",
          "transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:rotate-[0.5deg]",
        )}
      >
        <p className="font-hand pl-4 text-[23px] leading-[28px] font-bold text-[#23397a]">
          ok but did you hear the bridge on track 5??
          <br />
          <span className="text-pen">meet me on Swiftter</span> →
          <br />
          <span className="text-[19px] text-[#55648f]">(pass it on ♡)</span>
        </p>
      </div>
      <WashiTape className="top-[14px] left-1/2 -translate-x-1/2" color="rgba(159,211,199,.6)" rotate={-2} width={84} />
    </div>
  );
}
