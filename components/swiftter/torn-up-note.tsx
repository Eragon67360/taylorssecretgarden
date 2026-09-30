import { cn } from "@/lib/utils";

import { NoteSheet, type NotePaper, PAPERS, TEXT_INSET } from "./note-paper";
import { type FeedPosition } from "./post-note";

type TornUpNoteProps = {
  paper: NotePaper;
  resharedBy?: string;
  className?: string;
  /** In the feed: its place and how many there are (post-note.tsx). */
  position?: FeedPosition;
  /** The article's id: focus is moved to it after the Member tears a note up in a thread. */
  id?: string;
};

/**
 * Where a note was torn up by its author but something still points at it (a
 * reshare, the replies under it): a scrap of the page, saying so in words.
 */
export function TornUpNote({ paper, resharedBy, className, id, position }: TornUpNoteProps) {
  const look = PAPERS[paper];

  return (
    <article
      aria-label="A torn-up note"
      aria-posinset={position?.at}
      aria-setsize={position?.of}
      className={cn("focus-ring relative opacity-80", className)}
      id={id}
      style={{ rotate: `${look.tilt}deg`, color: look.soft }}
      tabIndex={-1}
    >
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
