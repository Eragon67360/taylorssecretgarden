"use client";

import type { HeldNote, RefusalCategory } from "@/lib/swiftter";

import Link from "next/link";
import { useId } from "react";

import { cn } from "@/lib/utils";

import { DeletePost } from "./delete-post";
import { PostContent } from "./post-content";
import { relativeDate } from "./relative-date";

/** The status, in words: never colour alone. */
const STATUS: Record<"pending" | RefusalCategory, string> = {
  pending: "Waiting for a check",
  insult: "Not passed: reads as unkind",
  restricted: "Not passed: not safe to share",
  off_topic: "Not passed: off-topic",
};

type HeldNotesProps = {
  notes: HeldNote[];
  checking: string | null;
  onCheckAgain: (note: HeldNote) => void;
  onTearUp: (note: HeldNote) => Promise<void>;
};

/**
 * The signed-in Member's notes that are not public, in their margin only:
 * waiting for a moderation check (with "check again"), or refused (with the
 * reason). Nobody else ever sees them.
 */
export function HeldNotes({ notes, checking, onCheckAgain, onTearUp }: HeldNotesProps) {
  const headingId = useId();

  if (!notes.length) return null;

  return (
    <section aria-labelledby={headingId} className="border-pen/40 bg-card mb-10 rounded-[4px] border-2 border-dashed px-5 py-4">
      <h2 className="font-hand text-[26px] leading-tight font-bold" id={headingId}>
        Only you can see these
      </h2>
      <p className="text-soft mt-1 text-[14.5px]">Notes that aren&apos;t on the feed: waiting for a check, or not passed.</p>
      <ul className="mt-4 flex flex-col gap-4">
        {notes.map((note) => {
          const status = note.status === "pending" ? STATUS.pending : STATUS[note.category ?? "insult"];

          return (
            <li key={note.id} className="bg-paper rounded-[3px] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,.12)]">
              <article aria-label={`Your note, ${status.toLowerCase()}`}>
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
                    {note.rootId ? (
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
                <PostContent className="text-ink mt-2 text-[15.5px] break-words" content={note.content} />
                <div className="mt-2 flex flex-wrap items-center gap-x-5">
                  {note.canCheckAgain && (
                    <button
                      aria-busy={checking === note.id}
                      className="font-hand focus-ring min-h-8 rounded-sm px-1 text-[20px] font-bold underline decoration-[1.5px] underline-offset-[4px] disabled:opacity-60"
                      disabled={checking !== null}
                      type="button"
                      onClick={() => onCheckAgain(note)}
                    >
                      {checking === note.id ? "checking…" : "check again"}
                    </button>
                  )}
                  <DeletePost onDelete={() => onTearUp(note)} />
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
