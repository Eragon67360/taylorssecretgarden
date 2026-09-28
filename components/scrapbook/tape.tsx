import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

// Torn ends: a zig-zag clip on both short edges.
const TORN_ENDS =
  "polygon(0 8%, 4% 0, 8% 10%, 12% 2%, 16% 9%, 20% 0, 80% 0, 84% 9%, 88% 1%, 92% 10%, 96% 0, 100% 7%, 100% 93%, 96% 100%, 92% 90%, 88% 99%, 84% 91%, 80% 100%, 20% 100%, 16% 91%, 12% 98%, 8% 90%, 4% 100%, 0 92%)";

type WashiTapeProps = {
  /** Position it with utilities (e.g. `-top-3 left-1/2`); the parent must be positioned. */
  className?: string;
  /** Tape colour; defaults to the Era's tape. */
  color?: string;
  /** Degrees. */
  rotate?: number;
  /** Pixels. */
  width?: number;
};

/** A strip of translucent washi tape with torn ends. Decorative. */
export function WashiTape({ className, color = "var(--tape)", rotate = -4, width = 96 }: WashiTapeProps) {
  const style: CSSProperties = {
    width,
    background: `linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,0) 40%), ${color}`,
    clipPath: TORN_ENDS,
    rotate: `${rotate}deg`,
  };

  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute z-20 block h-[26px] shadow-[0_1px_1px_rgba(0,0,0,.06)]", className)}
      style={style}
    />
  );
}

type PinProps = {
  className?: string;
  /** Pin head colour; defaults to the pen red. */
  color?: string;
};

/** A push pin, seen from above. Decorative. */
export function Pin({ className, color = "var(--pen)" }: PinProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute z-20 block size-4 rounded-full shadow-[1px_3px_3px_rgba(0,0,0,.35)]", className)}
      style={{
        background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.9) 0 12%, ${color} 34%, color-mix(in srgb, ${color} 60%, black) 100%)`,
      }}
    />
  );
}
