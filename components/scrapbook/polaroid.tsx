"use client";

import type { ReactNode } from "react";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

import { WashiTape } from "./tape";
import { useLift } from "./use-lift";

type PolaroidProps = {
  /** The photo (an <img>, next/image or a video); it fills the frame's width. */
  children: ReactNode;
  /** Handwritten caption on the frame's thick bottom edge. */
  caption?: ReactNode;
  /** Resting tilt, in degrees. */
  tilt?: number;
  /** Tape across the top corners. */
  taped?: boolean;
  /** Lift and straighten on hover (off under reduced motion). */
  lift?: boolean;
  className?: string;
};

/** An instant photo: white frame, thick bottom edge with a handwritten caption. */
export function Polaroid({ children, caption, tilt = -2, taped = false, lift = false, className }: PolaroidProps) {
  const motionProps = useLift(tilt, lift);

  return (
    <motion.figure
      className={cn(
        "relative bg-photo p-2.5 pb-3 shadow-[0_1px_2px_rgba(0,0,0,.12),0_22px_36px_-18px_rgba(40,20,10,.55)] sm:p-3",
        className,
      )}
      {...motionProps}
    >
      {taped && (
        <>
          <WashiTape className="-top-2 -left-6" rotate={-36} width={96} />
          <WashiTape className="-top-2 -right-6" rotate={34} width={96} />
        </>
      )}
      <div className="relative overflow-hidden bg-[#e9e2d4] [&>img]:block [&>img]:w-full [&>video]:block [&>video]:w-full">
        {children}
        {/* Photo paper: a little grain over the print. */}
        <span aria-hidden="true" className="paper-grain pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply" />
      </div>
      {caption ? (
        <figcaption className="font-hand px-2 pt-3 text-center text-[22px] font-bold leading-tight text-[var(--photo-ink)] sm:text-2xl">
          {caption}
        </figcaption>
      ) : (
        <span aria-hidden="true" className="block h-8" />
      )}
    </motion.figure>
  );
}
