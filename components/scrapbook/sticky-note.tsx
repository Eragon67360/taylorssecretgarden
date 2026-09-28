"use client";

import type { ReactNode } from "react";

import * as m from "motion/react-m";

import { cn } from "@/lib/utils";

import { Pin, WashiTape } from "./tape";
import { useLift } from "./use-lift";

const TONES = {
  /** The classic canary note; the same in every Era. */
  yellow: { paper: "bg-sticky", ink: "text-[var(--sticky-ink)]" },
  /** A note tinted with the current Era's accent. */
  era: { paper: "bg-[color-mix(in_srgb,var(--accent)_24%,var(--card))]", ink: "text-ink" },
} as const;

type StickyNoteProps = {
  children: ReactNode;
  tone?: keyof typeof TONES;
  /** How it is stuck to the page. */
  attach?: "none" | "pin" | "tape";
  /** Resting tilt, in degrees. */
  tilt?: number;
  /** Lift and straighten on hover (off under reduced motion). */
  lift?: boolean;
  className?: string;
};

/** A sticky note with a curled corner. Its text is handwritten by default. */
export function StickyNote({ children, tone = "yellow", attach = "none", tilt = -3, lift = false, className }: StickyNoteProps) {
  const motionProps = useLift(tilt, lift);

  return (
    <m.div
      className={cn(
        "font-hand relative p-4 pb-5 text-[22px] font-bold leading-[1.1] drop-shadow-[0_8px_8px_rgba(0,0,0,.18)]",
        TONES[tone].ink,
        className,
      )}
      {...motionProps}
    >
      {/* The note, with its bottom-right corner folded up. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 [clip-path:polygon(0_0,100%_0,100%_calc(100%-18px),calc(100%-18px)_100%,0_100%)]",
          TONES[tone].paper,
        )}
      />
      <span
        aria-hidden="true"
        className="absolute right-0 bottom-0 size-[18px] bg-[linear-gradient(135deg,rgba(0,0,0,.16)_50%,transparent_50%)]"
      />
      {attach === "pin" && <Pin className="top-1.5 left-1/2 -translate-x-1/2" />}
      {attach === "tape" && <WashiTape className="-top-3 left-1/2 -translate-x-1/2" rotate={-3} width={80} />}
      <div className={cn("relative", attach === "pin" && "pt-2")}>{children}</div>
    </m.div>
  );
}
