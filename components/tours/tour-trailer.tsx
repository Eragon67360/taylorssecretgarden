"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { Polaroid } from "@/components/scrapbook";
import { type Trailer } from "@/lib/tours";
import { cn } from "@/lib/utils";

type TourTrailerProps = {
  trailer: Trailer;
  /** Rendered width on a wide screen, for the still's `sizes`. */
  width: number;
  tilt?: number;
  className?: string;
};

/**
 * A Tour's official trailer in a taped polaroid, behind a click: a free photo
 * of the Tour and a play button stand in for it, and the YouTube player (its
 * no-cookie host) is only put in the page once the visitor presses play. So
 * nothing loads from YouTube, and it sets nothing, before they choose to.
 */
export function TourTrailer({ trailer, width, tilt = 3, className }: TourTrailerProps) {
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const { still } = trailer;

  // The button the visitor pressed is gone: keep their place on the player.
  useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  return (
    <div className={cn("relative", className)}>
      <Polaroid
        taped
        caption={
          <>
            <span>{still.caption}</span>
            <span className="font-body block text-[11px] font-normal">Plays from YouTube</span>
          </>
        }
        credit={still.credit}
        tilt={tilt}
      >
        {playing ? (
          <iframe
            ref={frameRef}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            className="block aspect-video w-full"
            referrerPolicy="strict-origin-when-cross-origin"
            src={`https://www.youtube-nocookie.com/embed/${trailer.youtubeId}?autoplay=1&rel=0`}
            title={trailer.title}
          />
        ) : (
          // On the photo, so it is inked (and focus-ringed) in the photo ink, not the Era's.
          <button
            aria-label={`Play ${trailer.name} (YouTube)`}
            className="group relative block w-full cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
            type="button"
            onClick={() => setPlaying(true)}
          >
            <Image
              alt={still.alt}
              className="block aspect-video h-auto w-full object-cover"
              height={still.size[1]}
              sizes={`(max-width: 640px) 90vw, ${width}px`}
              src={still.src}
              width={still.size[0]}
            />
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/65 pl-1 text-2xl text-white shadow-lg transition-transform duration-200 ease-out motion-safe:group-hover:scale-110"
            >
              ▶
            </span>
          </button>
        )}
      </Polaroid>
    </div>
  );
}
