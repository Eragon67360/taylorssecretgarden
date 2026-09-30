import type { ReactNode } from "react";

import { PressedFlower, WashiTape } from "@/components/scrapbook";
import { cn } from "@/lib/utils";

import { LINE, NoteSheet, type NotePaper, PAPERS, ruling, TEXT_INSET } from "./note-paper";

/** A blank note, standing in for a Post while the feed loads. */
function BlankNote({ paper, lines }: { paper: NotePaper; lines: number }) {
  return (
    <div aria-hidden="true" className="relative" style={{ rotate: `${PAPERS[paper].tilt}deg` }}>
      <NoteSheet paper={paper} />
      <div className="relative h-[76px]" />
      <div className="relative pb-7" style={{ ...ruling(paper), height: (lines + 1) * LINE }} />
    </div>
  );
}

/** The feed loading: two blank notes. */
export function FeedLoading() {
  return (
    <div className="flex flex-col gap-9">
      <p className="sr-only" role="status">
        Loading notes…
      </p>
      <BlankNote lines={3} paper="lined" />
      <BlankNote lines={2} paper="sticky" />
    </div>
  );
}

/** A blank page with a flower pressed in it, and a handwritten line. Text sits on the lines (mt-7 is one line). */
function DrawnState({ children, flower, tilt }: { children: ReactNode; flower: "daisy" | "leaf"; tilt: number }) {
  return (
    <div className="relative" style={{ rotate: `${tilt}deg`, color: PAPERS.lined.ink }}>
      <NoteSheet paper="lined" />
      <WashiTape className="-top-3 left-1/2 -translate-x-1/2" rotate={2} width={92} />
      <div className={cn("relative flex min-h-[308px] flex-col pr-6 pb-7 sm:flex-row sm:items-start sm:pr-10", TEXT_INSET)} style={ruling("lined")}>
        <div className="relative z-10 flex-1 pt-7">{children}</div>
        <PressedFlower
          className={cn("mx-auto h-44 w-28 shrink-0 sm:mx-0 sm:h-56 sm:w-32", flower === "leaf" ? "rotate-[160deg] opacity-80" : "rotate-12")}
          color={flower === "daisy" ? "#eaa3b8" : "#8a8f6a"}
          kind={flower}
        />
      </div>
    </div>
  );
}

/** Nobody has passed a note yet. */
export function FeedEmpty({ action }: { action?: ReactNode }) {
  return (
    <DrawnState flower="daisy" tilt={-0.6}>
      <p className="font-hand text-[30px] font-bold">No notes passed yet.</p>
      <p className="mt-7 text-[16.5px]">The page is blank, the daisy is pressed. The first note is yours.</p>
      {action && <div className="mt-7">{action}</div>}
    </DrawnState>
  );
}

/** The feed could not be read. */
export function FeedError({ onRetry }: { onRetry: () => void }) {
  return (
    <DrawnState flower="leaf" tilt={0.6}>
      {/* Read out as it appears (it replaces the loading notes), the button left out. */}
      <div role="alert">
        <p className="font-hand text-[30px] font-bold">Hm, the note got lost on its way.</p>
        <p className="mt-7 text-[16.5px]">Swiftter can&apos;t reach its notes right now.</p>
      </div>
      <button
        className="bg-accent text-on-accent focus-ring mt-7 inline-flex min-h-11 items-center rounded-[4px] px-5 text-[15px] font-bold tracking-wide shadow-[0_2px_0_rgba(0,0,0,.15)]"
        type="button"
        onClick={onRetry}
      >
        Try again
      </button>
    </DrawnState>
  );
}
