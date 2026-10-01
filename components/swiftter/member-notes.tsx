"use client";

import type { FeedPage, FeedPost } from "@/lib/swiftter";

import { useState } from "react";

import { fetchMemberPosts } from "./api";
import { NoteActions } from "./note-actions";
import { paperFor, PostNote } from "./post-note";
import { noteElementId, useFocusAfterRender } from "./use-swiftter";

/**
 * A Member's public Posts on their page (app/swiftter/m/[id]): the first
 * page from the server, older ones a page at a time, as the feed does
 * (swiftter-board.tsx): announced, the keyboard carried on to the first new
 * note. Read-only: replying and resharing happen in the thread and the feed.
 */
export function MemberNotes({ member, firstPage }: { member: { id: string; displayName: string }; firstPage: FeedPage }) {
  const [posts, setPosts] = useState<FeedPost[]>(() => firstPage.items.flatMap((item) => (item.kind === "post" ? [item.post] : [])));
  const [nextCursor, setNextCursor] = useState(firstPage.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const focusSoon = useFocusAfterRender();

  const loadMore = async () => {
    // The button stays focusable while the page is read (aria-disabled): a second press does nothing.
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    const page = await fetchMemberPosts(member.id, nextCursor);

    setLoadingMore(false);
    if (!page) {
      setMoreFailed(true);

      return;
    }
    const more = page.items.flatMap((item) => (item.kind === "post" ? [item.post] : []));

    setPosts((previous) => [...previous, ...more]);
    setNextCursor(page.nextCursor);
    setAnnouncement(`${more.length} more ${more.length === 1 ? "note" : "notes"} loaded.`);
    if (more[0]) focusSoon(noteElementId(more[0].id));
  };

  return (
    <section aria-labelledby="member-notes">
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
      <h2 className="sr-only" id="member-notes" tabIndex={-1}>
        Notes by {member.displayName}
      </h2>
      {posts.length === 0 ? (
        <p className="font-hand text-soft text-[26px] leading-snug font-bold">{member.displayName} hasn&apos;t passed a note yet.</p>
      ) : (
        <div aria-busy={loadingMore} aria-label={`Notes by ${member.displayName}`} className="flex flex-col gap-9 sm:gap-11" role="feed">
          {posts.map((post, index) => (
            <PostNote
              key={post.id}
              // Their own page: the name needs no link back to it.
              authorLink={false}
              footer={<NoteActions authorName={post.author.displayName} postId={post.id} replyCount={post.replyCount} reshareCount={post.reshareCount} />}
              id={noteElementId(post.id)}
              paper={paperFor(index, posts.length)}
              position={{ at: index + 1, of: nextCursor ? -1 : posts.length }}
              post={post}
            />
          ))}
        </div>
      )}
      {nextCursor && (
        <div className="mt-10 flex flex-col items-center gap-2">
          {moreFailed && (
            <p className="text-pen text-[15px] font-semibold" role="alert">
              The next notes couldn&apos;t be read just now.
            </p>
          )}
          <button
            aria-busy={loadingMore}
            aria-disabled={loadingMore}
            className="font-hand focus-ring decoration-pen min-h-11 rounded-sm px-2 text-[25px] font-bold underline decoration-wavy decoration-[1.5px] underline-offset-[5px] aria-disabled:opacity-60"
            type="button"
            onClick={loadMore}
          >
            {loadingMore ? "turning the page…" : moreFailed ? "try again: older notes →" : "older notes →"}
          </button>
        </div>
      )}
    </section>
  );
}
