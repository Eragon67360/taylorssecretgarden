"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

import { Polaroid } from "@/components/scrapbook";
import { cloudinaryWidth, videoStill } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

type TourVideoProps = {
  /** The Tour's name, for the play/pause button. */
  tour: string;
  src: string;
  /** Handwritten caption on the polaroid. */
  caption: string;
  tilt?: number;
  className?: string;
};

/** Who decided last whether the video plays: the page (in view / hovered) or the visitor's button. */
type Mode = "auto" | "playing" | "paused";

/**
 * A Tour's footage in a taped polaroid. Muted; it plays while it is in view or
 * hovered, never on its own under reduced motion, and a button pauses or
 * plays it. Nothing downloads until it first plays (a still frame stands in).
 */
export function TourVideo({ tour, src, caption, tilt = 3, className }: TourVideoProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mode, setMode] = useState<Mode>("auto");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.4 });

    observer.observe(frame);

    return () => observer.disconnect();
  }, []);

  // Only ever on screen; on its own only when motion is welcome.
  const shouldPlay = (inView || hovered) && (mode === "playing" || (mode === "auto" && reduce === false));

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;
    if (shouldPlay) {
      video.muted = true;
      // A play() cut short by a pause() rejects; that is expected, not an error.
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [shouldPlay]);

  return (
    <div
      ref={frameRef}
      className={cn("relative", className)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <Polaroid
        taped
        caption={
          <span className="flex items-center justify-center gap-2">
            <span>{caption}</span>
            {/* On the polaroid's white frame, so it is inked (and focus-ringed) in the photo ink, not the Era's. */}
            <button
              aria-label={`${playing ? "Pause" : "Play"} ${tour} video`}
              className="font-body grid size-8 shrink-0 place-items-center rounded-full border border-current text-xs text-[var(--photo-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--photo-ink)]"
              type="button"
              onClick={() => setMode(playing ? "paused" : "playing")}
            >
              <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
            </button>
          </span>
        }
        tilt={tilt}
      >
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          aria-hidden="true"
          className="aspect-video object-cover"
          poster={videoStill(src, 720)}
          preload="none"
          src={`${cloudinaryWidth(src, 720)}#t=12`}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
      </Polaroid>
    </div>
  );
}
