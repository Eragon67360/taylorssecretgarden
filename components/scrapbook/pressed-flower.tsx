import type { CSSProperties } from "react";
import type { Flower } from "@/lib/eras";

import { cn } from "@/lib/utils";

export const FLOWERS: readonly Flower[] = ["daisy", "fern", "lavender", "rose", "leaf"];

type PressedFlowerProps = {
  kind: Flower;
  /** Petal (or frond) colour; defaults to the Era's accent. */
  color?: string;
  /** Size and position it with utilities (e.g. `h-40 w-24 rotate-12`). */
  className?: string;
  style?: CSSProperties;
};

/** A flower pressed flat between the pages. Decorative inline SVG. */
export function PressedFlower({ kind, color = "var(--accent)", className, style }: PressedFlowerProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none drop-shadow-[1px_2px_1.5px_rgba(40,30,20,.18)]", className)}
      focusable="false"
      style={style}
      viewBox="0 0 120 200"
    >
      {kind === "daisy" && <Daisy color={color} />}
      {kind === "fern" && <Fern color={color} />}
      {kind === "lavender" && <Lavender color={color} />}
      {kind === "rose" && <Rose color={color} />}
      {kind === "leaf" && <Leaves color={color} />}
    </svg>
  );
}

const STEM = "var(--stem)";

function Daisy({ color }: { color: string }) {
  return (
    <g>
      <path d="M60 196 C58 150 64 120 60 78" fill="none" stroke={STEM} strokeLinecap="round" strokeWidth="2.4" />
      <path d="M60 150 C44 140 36 146 30 138 C42 132 52 136 60 146Z" fill={STEM} opacity=".85" />
      <path d="M61 124 C76 112 86 118 92 110 C80 106 68 110 61 120Z" fill={STEM} opacity=".8" />
      {Array.from({ length: 14 }, (_, index) => (
        <ellipse
          key={index}
          cx="60"
          cy="52"
          fill={color}
          opacity=".88"
          rx="6"
          ry="21"
          stroke="rgba(0,0,0,.08)"
          strokeWidth=".6"
          transform={`rotate(${index * (360 / 14)} 60 58) translate(0 -2)`}
        />
      ))}
      <circle cx="60" cy="58" fill="#E9B949" r="9" />
      <circle cx="60" cy="58" fill="none" r="9" stroke="#C89528" strokeDasharray="1 2" strokeWidth="1" />
    </g>
  );
}

function Fern({ color }: { color: string }) {
  return (
    <g>
      <path d="M60 198 C62 150 56 90 66 14" fill="none" stroke={color} strokeLinecap="round" strokeWidth="2.2" />
      {Array.from({ length: 13 }, (_, index) => {
        const y = 180 - index * 12.5;
        const scale = 1 - index * 0.06;

        return (
          <g key={index} opacity=".9">
            <ellipse
              cx={60 - 13 * scale}
              cy={y}
              fill={color}
              rx={15 * scale}
              ry={4.5 * scale}
              transform={`rotate(-28 ${60 - 13 * scale} ${y})`}
            />
            <ellipse
              cx={62 + 13 * scale}
              cy={y - 5}
              fill={color}
              rx={15 * scale}
              ry={4.5 * scale}
              transform={`rotate(28 ${62 + 13 * scale} ${y - 5})`}
            />
          </g>
        );
      })}
    </g>
  );
}

function Lavender({ color }: { color: string }) {
  return (
    <g>
      <path d="M58 198 C58 140 62 90 60 30" fill="none" stroke={STEM} strokeLinecap="round" strokeWidth="2" />
      <path d="M60 170 C48 150 40 150 34 136" fill="none" stroke={STEM} strokeWidth="1.6" />
      {Array.from({ length: 12 }, (_, index) => (
        <g key={index}>
          <ellipse cx={55} cy={36 + index * 8} fill={color} opacity=".85" rx="5" ry="7" transform={`rotate(-24 55 ${36 + index * 8})`} />
          <ellipse cx={65} cy={40 + index * 8} fill={color} opacity=".75" rx="5" ry="7" transform={`rotate(24 65 ${40 + index * 8})`} />
        </g>
      ))}
    </g>
  );
}

function Rose({ color }: { color: string }) {
  return (
    <g>
      <path d="M60 198 C56 160 66 120 60 84" fill="none" stroke={STEM} strokeLinecap="round" strokeWidth="2.6" />
      <path d="M60 140 C40 130 32 136 24 124 C40 116 52 124 60 134Z" fill={STEM} opacity=".85" />
      <path d="M61 116 C80 106 90 112 98 100 C84 94 70 100 61 110Z" fill={STEM} opacity=".8" />
      <circle cx="60" cy="60" fill={color} opacity=".82" r="28" />
      <path
        d="M60 60 m-18 0 a18 18 0 1 0 36 0 a14 14 0 1 0 -28 2 a9 9 0 1 0 18 -2 a5 5 0 1 0 -10 1"
        fill="none"
        stroke="rgba(0,0,0,.25)"
        strokeWidth="1.6"
      />
      <path d="M34 50 C40 34 52 30 60 32 C70 30 82 36 86 50" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
    </g>
  );
}

const LEAVES: [x: number, y: number, rotate: number][] = [
  [48, 160, -40],
  [74, 130, 30],
  [56, 110, -38],
  [82, 84, 28],
  [66, 62, -34],
  [88, 40, 24],
];

function Leaves({ color }: { color: string }) {
  return (
    <g>
      <path d="M40 198 C50 150 70 90 84 20" fill="none" stroke={STEM} strokeLinecap="round" strokeWidth="2" />
      {LEAVES.map(([x, y, rotate], index) => (
        <path
          key={index}
          d={`M${x} ${y} c-18 -6 -26 -20 -24 -34 c14 4 24 16 24 34z`}
          fill={color}
          opacity=".85"
          transform={`rotate(${rotate} ${x} ${y})`}
        />
      ))}
    </g>
  );
}
