"use client";

import type { ReactNode } from "react";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

import { useLift } from "./use-lift";

// Two half-moon notches where the stub tears off.
const NOTCHES =
  "radial-gradient(circle 11px at 0 50%, transparent 98%, #000) left / 51% 100% no-repeat, radial-gradient(circle 11px at 100% 50%, transparent 98%, #000) right / 51% 100% no-repeat";

type TicketStubProps = {
  /** Small print at the top, e.g. "Admit one · floor". */
  kicker: string;
  /** The event, set large. */
  title: ReactNode;
  /** Small print at the bottom, e.g. seat or dates. */
  meta?: string;
  /** A picture on the stub's left (an <img> or next/image filling its box). */
  picture?: ReactNode;
  /** Resting tilt, in degrees. */
  tilt?: number;
  /** Lift and straighten on hover (off under reduced motion). */
  lift?: boolean;
  className?: string;
};

/** A concert ticket stub with notched edges and a perforated tear line. */
export function TicketStub({ kicker, title, meta, picture, tilt = -3, lift = false, className }: TicketStubProps) {
  const motionProps = useLift(tilt, lift);

  return (
    <motion.div className={cn("drop-shadow-[0_10px_12px_rgba(0,0,0,.22)]", className)} {...motionProps}>
      <div className="bg-card text-ink flex min-h-[150px] overflow-hidden" style={{ mask: NOTCHES, WebkitMask: NOTCHES }}>
        {picture && (
          <div className="relative w-[34%] shrink-0 overflow-hidden [&>img]:h-full [&>img]:w-full [&>img]:object-cover">{picture}</div>
        )}
        <div className={cn("flex min-w-0 flex-1 flex-col justify-between gap-2 p-4 pl-5", picture && "border-l-2 border-dashed border-line")}>
          <p className="text-soft text-[11px] font-bold tracking-[.26em] uppercase">{kicker}</p>
          <p className="font-serif text-[26px] leading-none font-semibold italic">{title}</p>
          {meta && <p className="text-soft font-mono text-[11px] tracking-wider">{meta}</p>}
        </div>
      </div>
    </motion.div>
  );
}
