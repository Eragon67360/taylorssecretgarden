import type { CSSProperties } from "react";

import Link from "next/link";

import { Arrow, Bracelet, Polaroid, PressedFlower, RubberStamp, Scribble, StickyNote } from "@/components/scrapbook";
import { cn } from "@/lib/utils";

import styles from "./home.module.css";

/** The Eras Tour photo, cropped to a 4:5 print around Taylor by Cloudinary. */
const photo = (width: number) =>
  `https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto,c_fill,g_auto,ar_4:5,w_${width}/v1/images/upload/taylorssecretgarden/backgrounds/home`;

const delay =(ms: number) => ({ "--drop-delay": `${ms}ms` }) as CSSProperties;

/** The opening spread: the garden's name on the left, a taped Eras photo with a sticky note and a stamp on the right. */
export function Hero() {
  return (
    <>
      <section
        aria-labelledby="home-title"
        className="relative mx-auto grid w-full max-w-[1240px] items-center gap-14 px-4 pt-10 pb-10 sm:px-8 md:pt-14 lg:grid-cols-12 lg:gap-8"
      >
        <div className="relative lg:col-span-6">
          <p className="font-hand text-accent mb-3 inline-block -rotate-2 text-2xl">dear diary: est. 2006, still not over it</p>
          <h1
            className="font-serif relative text-[clamp(3.4rem,9vw,7.6rem)] leading-[0.9] font-semibold tracking-[-0.02em]"
            id="home-title"
          >
            <span className="block">Taylor&apos;s</span>{" "}
            <span className="text-accent relative inline-block font-normal italic">
              Secret
              <PressedFlower
                className="absolute -top-8 -right-9 h-24 w-14 rotate-[28deg] sm:-top-10 sm:-right-14 sm:h-36 sm:w-20"
                color="#A98BD6"
                kind="lavender"
              />
            </span>{" "}
            <span className="sm:block">Garden</span>
          </h1>
          <p className="text-soft mt-7 max-w-[34rem] text-[17px] leading-relaxed sm:text-lg">
            A fan-kept scrapbook of every Era: the Albums and their tracklists, the Tours, the bridges that ruined us. And{" "}
            <strong className="text-ink">Swiftter</strong>, where Swifties pass notes.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5">
            {/* A luggage tag, punched and strung. */}
            <Link
              className={cn(
                "group bg-accent text-on-accent focus-ring relative inline-flex min-h-12 items-center gap-3 py-3.5 pr-6 pl-9 text-[15px] font-bold tracking-wide",
                "rounded-[4px] [clip-path:polygon(14px_0,100%_0,100%_100%,14px_100%,0_50%)]",
                "shadow-[0_2px_0_rgba(0,0,0,.15),0_8px_18px_-8px_rgba(60,20,20,.5)] transition-transform duration-200 ease-out",
                "motion-safe:hover:-translate-y-0.5 motion-safe:hover:-rotate-2 motion-safe:active:scale-[.97]",
              )}
              href="/music"
            >
              <span aria-hidden="true" className="bg-paper absolute top-1/2 left-[14px] size-2.5 -translate-y-1/2 rounded-full" />
              Open the music journal
              <span aria-hidden="true" className="transition-transform duration-200 ease-out motion-safe:group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link className="group font-hand text-ink focus-ring relative rounded-sm text-[26px] font-bold" href="/swiftter">
              or pass a note on Swiftter
              <Scribble
                className="absolute -bottom-1 left-0 h-3 w-full origin-left transition-transform duration-300 ease-out motion-safe:group-hover:scale-x-105"
                color="var(--pen)"
              />
            </Link>
          </div>
        </div>

        {/* The taped photo, with what we scribbled around it. */}
        <div className="relative mx-auto w-full max-w-[520px] pt-6 pb-8 lg:col-span-6 lg:pl-6">
          <PressedFlower
            className="absolute top-0 -right-1 h-56 w-32 rotate-[18deg] sm:-right-8 sm:h-80 sm:w-44"
            color="#6F8A55"
            kind="fern"
          />
          <PressedFlower
            className="absolute bottom-0 -left-2 z-30 h-44 w-24 -rotate-[24deg] sm:-left-10 sm:h-56 sm:w-32"
            color="#FFFFFF"
            kind="daisy"
          />

          <Polaroid
            taped
            caption={
              <>
                the orange one. <span className="text-pen">I screamed.</span>
              </>
            }
            className="z-10 mx-auto w-[86%]"
            tilt={2.5}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary crops, resizes and encodes it */}
            <img
              alt="Taylor Swift singing on stage in the orange sequinned Eras Tour two-piece"
              className="aspect-[4/5] object-cover"
              height={525}
              sizes="(min-width: 1024px) 420px, 80vw"
              src={photo(840)}
              srcSet={[420, 640, 840, 1100].map((width) => `${photo(width)} ${width}w`).join(", ")}
              width={420}
            />
          </Polaroid>

          <div className={cn(styles.drop, "absolute top-14 -left-1 z-20 sm:-left-7")} style={delay(120)}>
            <StickyNote className="w-[140px] text-[21px] sm:w-[156px] sm:text-[23px]" tilt={-6}>
              <span>Who is Taylor Swift anyway?</span>{" "}
              <span className="text-pen relative inline-block px-1">
              EW
              <svg
                aria-hidden="true"
                className="absolute -inset-x-2 -inset-y-1.5 h-[calc(100%+12px)] w-[calc(100%+16px)]"
                focusable="false"
                viewBox="0 0 60 36"
              >
                <ellipse cx="30" cy="18" fill="none" rx="27" ry="14" stroke="currentColor" strokeWidth="2" transform="rotate(-6 30 18)" />
              </svg>
              </span>
            </StickyNote>
          </div>
          <Arrow className="absolute top-[210px] left-[96px] z-20 hidden h-16 w-24 rotate-[12deg] sm:block" />

          <div className={cn(styles.drop, "absolute right-0 bottom-24 z-20 sm:-right-5 sm:bottom-2")} style={delay(180)}>
            <RubberStamp big="NOT" bottom="Taylor's Version" top="This is" />
          </div>
        </div>
      </section>

      {/* The friendship bracelet, left between the pages. */}
      <div className="relative mx-auto flex max-w-[1240px] flex-col items-center gap-2 px-4 py-6">
        <Bracelet className="-rotate-[1.5deg]" size="lg" word="Secret Garden" />
        <p className="font-hand text-soft rotate-1 text-center text-xl">
          (made it at the Eras Tour. traded it for a <em>Lover</em> one. no regrets)
        </p>
      </div>
    </>
  );
}
