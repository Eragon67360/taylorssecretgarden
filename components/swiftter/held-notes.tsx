"use client";

import type { HeldNote, RefusalCategory } from "@/lib/swiftter";

import Link from "next/link";
import { useId } from "react";

import { cn } from "@/lib/utils";

import { DeletePost } from "./delete-post";
import { PostContent } from "./post-content";
import { relativeDate } from "./relative-date";
import { heldElementId } from "./use-swiftter";

/** The status, in words: never colour alone. */
const STATUS: Record<"pending" | "givenUp" | RefusalCategory, string> = {
  pending: "Waiting for a check",
  givenUp: "Couldn't be checked",
  insult: "Not passed: reads as unkind",
  restricted: "Not passed: not safe to share",
  off_topic: "Not passed: off-topic",
};

/** What the Member can do with a held note: check it again (while pending), tear it up. */
export type HeldActions = {
  /** The note being checked again, if any: every "check again" waits for it. */
  checking: string | null;
  onCheckAgain: (note: HeldNote) => void;
  onTearUp: (note: HeldNote) => Promise<void>;
};

type HeldNotesProps = HeldActions & { notes: HeldNote[] };

/**
 * The signed-in Member's notes that are not public, in their margin only:
 * waiting for a moderation check (with "check again"), or refused (with the
 * reason). Nobody else ever sees them.
 */
export function HeldNotes({ notes, ...actions }: HeldNotesProps) {
  const headingId = useId();

  if (!notes.length) return null;

  return (
    <section aria-labelledby={headingId} className="border-pen/40 bg-card mb-10 rounded-[4px] border-2 border-dashed px-5 py-4">
      <h2 className="font-hand text-[26px] leading-tight font-bold" id={headingId}>
        Only you can see these
      </h2>
      <p className="text-soft mt-1 text-[14.5px]">
        Notes that aren&apos;t on the feed: waiting for a check, or not passed. Notes not passed are kept for 30 days.
      </p>
      <ul className="mt-4 flex flex-col gap-4">
        {notes.map((note) => (
          <li key={note.id} className="bg-paper rounded-[3px] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,.12)]">
            <HeldNoteCard note={note} {...actions} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One held note: its status in words, the reason for a refusal, the text,
 * and "check again" / "tear up". In the Member's margin on the feed, and
 * under its parent on a thread (`inThread`, where it needs no link to it).
 */
export function HeldNoteCard({ note, checking, onCheckAgain, onTearUp, inThread = false }: HeldActions & { note: HeldNote; inThread?: boolean }) {
  const status = note.givenUp ? STATUS.givenUp : note.status === "pending" ? STATUS.pending : STATUS[note.category ?? "insult"];
  const kind = note.rootId ? "reply" : "note";

  return (
    <article aria-label={`Your ${kind}, ${status.toLowerCase()}`} className="focus-ring" id={heldElementId(note.id)} tabIndex={-1}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p
          className={cn(
            "rounded-[3px] border-2 px-1.5 text-[12px] leading-[18px] font-extrabold tracking-[.1em] uppercase",
            note.status === "pending" ? "border-ink text-ink" : "border-pen text-pen",
          )}
        >
          <span aria-hidden="true">{note.status === "pending" ? "⏳ " : "✕ "}</span>
          {status}
        </p>
        <p className="text-soft text-[13px]">
          {inThread ? (
            "Only you can see this reply"
          ) : note.rootId ? (
            <Link className="focus-ring rounded-sm underline" href={`/swiftter/p/${note.rootId}`}>
              a reply
            </Link>
          ) : (
            "a Post"
          )}
          , {relativeDate(new Date(note.createdAt))}
        </p>
      </div>
      {note.reason && <p className="text-pen mt-2 text-[14.5px] font-semibold">{note.reason}</p>}
      {note.givenUp && (
        <p className="text-pen mt-2 text-[14.5px] font-semibold">
          Moderation couldn&apos;t be reached for a week, so this note won&apos;t be published. Tear it up and write it again.
        </p>
      )}
      {note.status === "pending" && !note.givenUp && !note.canCheckAgain && (
        <p className="text-soft mt-2 text-[14.5px]">It will be checked again automatically for up to a week.</p>
      )}
      <PostContent className="text-ink mt-2 text-[15.5px] break-words" content={note.content} />
      <div className="mt-2 flex flex-wrap items-center gap-x-5">
        {note.canCheckAgain && (
          <button
            aria-busy={checking === note.id}
            // Stays focusable while a check is out; a press then does nothing.
            aria-disabled={checking !== null}
            className="font-hand focus-ring min-h-8 rounded-sm px-1 text-[20px] font-bold underline decoration-[1.5px] underline-offset-[4px] aria-disabled:opacity-60"
            type="button"
            onClick={() => onCheckAgain(note)}
          >
            {checking === note.id ? "checking…" : "check again"}
          </button>
        )}
        <DeletePost onDelete={() => onTearUp(note)} />
      </div>
    </article>
  );
}
