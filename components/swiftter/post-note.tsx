"use client";

import Link from "next/link";
import { type ReactNode, useId, useSyncExternalStore } from "react";

import { type Author, memberPath } from "@/lib/swiftter";
import { cn } from "@/lib/utils";

import { DeletePost } from "./delete-post";
import { NoteSheet, type NotePaper, PAPERS, PinnedPhoto, ruling, TEXT_INSET } from "./note-paper";
import { PostContent } from "./post-content";
import { relativeDate } from "./relative-date";

/**
 * Lined paper and sticky notes in turn, counted from the oldest Post, so a
 * newly published Post never changes the paper of the ones already shown.
 */
export const paperFor = (index: number, count: number): NotePaper => ((count - 1 - index) % 2 === 0 ? "lined" : "sticky");

/**
 * "3 minutes ago", said again by the browser: the server wrote it a moment
 * earlier, and a note can turn from "just now" to "1 minute ago" in between.
 * The server's words stand through hydration (no mismatch), then the
 * browser's own clock takes over.
 */
const noSubscription = () => () => {};
const onClient = () => true;
const onServer = () => false;

function RelativeTime({ date, dateTime, className, id }: { date: Date; dateTime: string; className?: string; id?: string }) {
  // False while hydrating, true after: the change re-renders the date with the browser's clock.
  useSyncExternalStore(noSubscription, onClient, onServer);

  return (
    <time suppressHydrationWarning className={className} dateTime={dateTime} id={id} title={date.toLocaleString("en")}>
      {relativeDate(date)}
    </time>
  );
}

/** What a note shows: a feed Post, or a note in a thread. */
export type NoteLike = { id: string; content: string; isDemo: boolean; createdAt: string; publishedAt?: string; author: Author };

type PostNoteProps = {
  post: NoteLike;
  paper: NotePaper;
  /** Only on the signed-in Member's own notes. */
  onDelete?: () => Promise<void>;
  /** Under the text: replies, reshares. */
  footer?: ReactNode;
  /** Above the Member's name: who reshared it. */
  banner?: ReactNode;
  /** The article's id: focus is moved to it after an action (use-swiftter.ts). */
  id?: string;
  /** In the feed: its place (from 1) and how many there are (-1 while more pages remain). */
  position?: FeedPosition;
  /** The name links to the Member's page (app/swiftter/m/[id]); not on that page itself. */
  authorLink?: boolean;
};

export type FeedPosition = { at: number; of: number };

/**
 * One note, passed like a note in class: the Member's avatar pinned in the
 * corner, their name in handwriting, when it was published, then the text on
 * the lines, and what can be done with it underneath.
 */
export function PostNote({ post, paper, onDelete, footer, banner, id, position, authorLink = true }: PostNoteProps) {
  const { author } = post;
  const nameId = useId();
  const timeId = useId();
  const look = PAPERS[paper];
  const when = post.publishedAt ?? post.createdAt;
  const published = new Date(when);

  return (
    <article
      // Named by who wrote it and when ("Juniper Wells, 3 hours ago"): one Member's notes are told apart.
      aria-labelledby={`${nameId} ${timeId}`}
      aria-posinset={position?.at}
      aria-setsize={position?.of}
      className="focus-ring relative drop-shadow-[0_10px_12px_rgba(40,20,10,.18)]"
      id={id}
      style={{ rotate: `${look.tilt}deg`, color: look.ink }}
      // Not in the tab order; focus lands here when an action takes away what the Member was on.
      tabIndex={-1}
    >
      <NoteSheet paper={paper} />
      <PinnedPhoto name={author.displayName} src={author.avatarUrl} />
      {banner}

      <header className={cn("relative min-h-[76px] pt-4 pr-4 sm:pr-6", TEXT_INSET)}>
        <div className="flex items-center gap-3">
          <p className="font-hand min-w-0 truncate text-[26px] leading-[1.05] font-bold" id={nameId}>
            {/* A torn-up note has no author (NO_AUTHOR): nothing to link to. */}
            {authorLink && author.id ? (
              <Link className="focus-ring rounded-sm decoration-[1.5px] underline-offset-[5px] hover:underline" href={memberPath(author.id)}>
                {author.displayName}
              </Link>
            ) : (
              author.displayName
            )}
          </p>
          {post.isDemo && (
            <span className="border-pen text-pen ml-auto shrink-0 -rotate-6 rounded-[3px] border-2 px-1.5 text-[11px] leading-[16px] font-extrabold tracking-[.14em] uppercase">
              Demo
            </span>
          )}
          {onDelete && (
            <span className="ml-auto">
              <DeletePost content={post.content} onDelete={onDelete} />
            </span>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-3" style={{ color: look.soft }}>
          {author.username && <p className="min-w-0 truncate text-[13px] font-semibold">@{author.username}</p>}
          <RelativeTime className="font-hand ml-auto shrink-0 text-[20px] leading-none font-bold whitespace-nowrap" date={published} dateTime={when} id={timeId} />
        </div>
      </header>

      <PostContent className={cn("relative pr-5 pb-7 text-[16.5px] break-words sm:pr-8", TEXT_INSET)} content={post.content} style={ruling(paper)} />
      {footer && <div className={cn("relative -mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 pr-4 pb-5 sm:pr-6", TEXT_INSET)}>{footer}</div>}
    </article>
  );
}
