"use client";

import type { FeedPost } from "@/service/swiftter";

import { useId } from "react";

import { cn } from "@/lib/utils";

import { NoteSheet, type NotePaper, PAPERS, PinnedPhoto, ruling, TEXT_INSET } from "./note-paper";
import { PostContent } from "./post-content";
import { relativeDate } from "./relative-date";

/** Lined paper, then a sticky note, and so on down the feed. */
export const paperFor = (index: number): NotePaper => (index % 2 === 0 ? "lined" : "sticky");

/**
 * One Post, passed like a note in class: the Member's avatar pinned in the
 * corner, their name in handwriting, when they wrote it, then the Post on the
 * lines.
 */
export function PostNote({ post, paper }: { post: FeedPost; paper: NotePaper }) {
  const { author } = post;
  const nameId = useId();
  const look = PAPERS[paper];
  const published = new Date(post.createdAt);

  return (
    <article
      aria-labelledby={nameId}
      className="relative drop-shadow-[0_10px_12px_rgba(40,20,10,.18)]"
      style={{ rotate: `${look.tilt}deg`, color: look.ink }}
    >
      <NoteSheet paper={paper} />
      <PinnedPhoto name={author.displayName} src={author.avatarUrl} />

      <header className={cn("relative min-h-[76px] pt-4 pr-4 sm:pr-6", TEXT_INSET)}>
        <div className="flex items-center gap-3">
          <p className="font-hand min-w-0 truncate text-[26px] leading-[1.05] font-bold" id={nameId}>
            {author.displayName}
          </p>
          {post.isDemo && (
            <span className="border-pen text-pen ml-auto shrink-0 -rotate-6 rounded-[3px] border-2 px-1.5 text-[11px] leading-[16px] font-extrabold tracking-[.14em] uppercase">
              Demo
            </span>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-3" style={{ color: look.soft }}>
          {author.username && <p className="min-w-0 truncate text-[13px] font-semibold">@{author.username}</p>}
          <time
            className="font-hand ml-auto shrink-0 text-[20px] leading-none font-bold whitespace-nowrap"
            dateTime={post.createdAt}
            title={published.toLocaleString("en")}
          >
            {relativeDate(published)}
          </time>
        </div>
      </header>

      <PostContent className={cn("relative pr-5 pb-7 text-[16.5px] break-words sm:pr-8", TEXT_INSET)} content={post.content} style={ruling(paper)} />
    </article>
  );
}
