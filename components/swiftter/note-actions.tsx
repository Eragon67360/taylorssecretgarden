"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

const ACTION = "font-hand focus-ring inline-flex min-h-8 items-center gap-1.5 rounded-sm px-1 text-[20px] leading-none font-bold";

type NoteActionsProps = {
  postId: string;
  authorName: string;
  replyCount: number;
  reshareCount: number;
  /** Signed in and not the author: the reshare button; otherwise the count only. */
  reshare?: { reshared: boolean; busy: boolean; onToggle: () => void };
  /** Links to the thread; false on the thread page itself. */
  linkToThread?: boolean;
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Under a note, in pencil: its replies (a link to the thread) and its
 * reshares (a toggle for signed-in Members who did not write it). The counts
 * are part of each control's name, so a screen reader hears "3 replies to
 * Juniper's note" rather than a bare number.
 */
export function NoteActions({ postId, authorName, replyCount, reshareCount, reshare, linkToThread = true }: NoteActionsProps) {
  const replies = plural(replyCount, "reply", "replies");
  const reshares = plural(reshareCount, "reshare", "reshares");

  return (
    <>
      {linkToThread && (
        <Link className={cn(ACTION, "underline decoration-[1.5px] underline-offset-[4px]")} href={`/swiftter/p/${postId}`}>
          {replyCount === 0 ? "reply" : replies}
          <span className="sr-only"> to {authorName}&apos;s note</span>
        </Link>
      )}
      {reshare ? (
        <button
          aria-pressed={reshare.reshared}
          className={cn(ACTION, reshare.reshared && "text-pen", "disabled:opacity-60")}
          disabled={reshare.busy}
          type="button"
          onClick={reshare.onToggle}
        >
          {/* A toggle keeps its name; aria-pressed says whether it is on, the tick and the pen colour show it. */}
          <span aria-hidden="true">{reshare.reshared ? "✓" : "↻"}</span>
          reshare
          <span className="sr-only"> {authorName}&apos;s note,</span> <span className="text-[17px]">({reshares})</span>
        </button>
      ) : (
        reshareCount > 0 && (
          <p className="font-hand text-[20px] leading-none font-bold">
            <span aria-hidden="true">↻ </span>
            {reshares}
          </p>
        )
      )}
    </>
  );
}
