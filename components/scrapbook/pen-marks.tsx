import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PenMarkProps = {
  /** Ink colour; defaults to the Era's accent. */
  color?: string;
  /** Size and position it with utilities. */
  className?: string;
};

/** A hand-drawn double underline. Decorative. */
export function Scribble({ color = "var(--accent)", className }: PenMarkProps) {
  return (
    <svg aria-hidden="true" className={cn("pointer-events-none", className)} focusable="false" preserveAspectRatio="none" viewBox="0 0 200 16">
      <path d="M2 10 C40 4 80 13 120 7 S180 5 198 9" fill="none" stroke={color} strokeLinecap="round" strokeWidth="3" />
      <path d="M8 13 C60 8 110 14 190 11" fill="none" opacity=".6" stroke={color} strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

/** A hand-drawn curved arrow, pointing right (or left when flipped). Decorative. */
export function Arrow({ color = "var(--pen)", className, flip = false }: PenMarkProps & { flip?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none", flip && "-scale-x-100", className)}
      focusable="false"
      viewBox="0 0 120 80"
    >
      <path d="M6 10 C30 60 70 70 108 56" fill="none" stroke={color} strokeLinecap="round" strokeWidth="2.6" />
      <path d="M94 46 L110 56 L96 68" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" />
    </svg>
  );
}

/**
 * Marker highlight behind a run of text, wrapping across lines. The text keeps
 * its own colour; the marker is a translucent tint of the Era's accent.
 */
export function Highlight({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  const marker = color ?? "color-mix(in srgb, var(--accent) 30%, transparent)";

  return (
    <mark
      className={cn("rounded-[2px] bg-transparent px-1 text-inherit [box-decoration-break:clone] [-webkit-box-decoration-break:clone]", className)}
      style={{ backgroundImage: `linear-gradient(100deg, transparent 0 2%, ${marker} 4% 94%, transparent 97%)` }}
    >
      {children}
    </mark>
  );
}
