import type { CSSProperties } from "react";

import Image from "next/image";

import { Pin, WashiTape } from "@/components/scrapbook";

/** Height of one ruled line; text on a note sits on the lines. */
export const LINE = 28;

/** Left edge of the writing, right of the margin (and the pinned photo). */
export const TEXT_INSET = "pl-[78px]";

/**
 * The two kinds of note Swiftter is written on: a page torn from a school
 * exercise book (blue ruling, red margin, blue ink) and a canary sticky note.
 * Colours are fixed, the same in every Era, and pass AA for the text on them.
 */
export const PAPERS = {
  lined: {
    ink: "#23397a",
    soft: "#46557f",
    tilt: -0.7,
    fold: 26,
    sheet: {
      backgroundColor: "#fffefa",
      backgroundImage: "linear-gradient(90deg, transparent 0 63px, #e7a0a0 63px 64.5px, transparent 64.5px)",
    },
    rule: "#bcd3e6",
  },
  sticky: {
    ink: "var(--sticky-ink)",
    soft: "#5a4535",
    tilt: 0.9,
    fold: 22,
    sheet: { backgroundColor: "var(--sticky)" },
    rule: "rgba(43, 29, 20, .12)",
  },
} as const satisfies Record<string, { ink: string; soft: string; tilt: number; fold: number; sheet: CSSProperties; rule: string }>;

export type NotePaper = keyof typeof PAPERS;

/** Ruled lines behind text set at `LINE` height, from the top of the element. */
export const ruling = (paper: NotePaper): CSSProperties => ({
  lineHeight: `${LINE}px`,
  backgroundImage: `repeating-linear-gradient(180deg, transparent 0 ${LINE - 1}px, ${PAPERS[paper].rule} ${LINE - 1}px ${LINE}px)`,
});

/**
 * The paper behind a note, filling its positioned parent: the sheet with its
 * bottom-right corner folded over, and a strip of tape on sticky notes.
 * Decorative.
 */
export function NoteSheet({ paper }: { paper: NotePaper }) {
  const { sheet, fold } = PAPERS[paper];

  return (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ ...sheet, clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${fold}px), calc(100% - ${fold}px) 100%, 0 100%)` }}
      />
      <span
        aria-hidden="true"
        className="absolute right-0 bottom-0"
        style={{ width: fold, height: fold, background: "linear-gradient(135deg, rgba(0,0,0,.14) 50%, transparent 50%)" }}
      />
      {paper === "sticky" && <WashiTape className="-top-3 left-1/2 -translate-x-1/2" color="rgba(159, 211, 199, .7)" rotate={-2} width={88} />}
    </>
  );
}

/** A Member's avatar as a tiny photo pinned to the top-left corner of their note. */
export function PinnedPhoto({ name, src }: { name: string; src: string | null }) {
  const initials = name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="bg-photo absolute top-3 left-2.5 z-10 block -rotate-6 p-1 pb-3 shadow-[0_1px_1px_rgba(0,0,0,.1),0_8px_12px_-6px_rgba(40,20,10,.5)]">
      {src ? (
        <Image alt={`${name}'s avatar`} className="block size-11 object-cover" height={44} src={src} width={44} />
      ) : (
        <span aria-hidden="true" className="bg-accent text-on-accent flex size-11 items-center justify-center text-sm font-bold">
          {initials}
        </span>
      )}
      <Pin className="-top-1.5 left-1/2 -translate-x-1/2" />
    </span>
  );
}
