import { cn } from "@/lib/utils";

import { NoteSheet, type NotePaper, PAPERS, TEXT_INSET } from "./note-paper";

/**
 * Where a note was torn up by its author but something still points at it (a
 * reshare, the replies under it): a scrap of the page, saying so in words.
 */
export function TornUpNote({ paper, resharedBy, className }: { paper: NotePaper; resharedBy?: string; className?: string }) {
  const look = PAPERS[paper];

  return (
    <article aria-label="A torn-up note" className={cn("relative opacity-80", className)} style={{ rotate: `${look.tilt}deg`, color: look.soft }}>
      <NoteSheet paper={paper} />
      {resharedBy && (
        <p className="font-hand relative pt-3 pl-[78px] text-[19px] leading-none font-bold">
          <span aria-hidden="true">↻ </span>
          {resharedBy} reshared
        </p>
      )}
      <p className={cn("font-hand relative py-6 pr-5 text-[22px] leading-tight font-bold", TEXT_INSET)}>
        <span aria-hidden="true">✂ </span>
        This note was torn up by its author.
      </p>
    </article>
  );
}
