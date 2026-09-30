"use client";

import type { PublishResult } from "./composer";
import type { FeedItem, FeedPost, HeldNote } from "@/lib/swiftter";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { IntentLink } from "@/components/intent-link";
import { WashiTape } from "@/components/scrapbook";
import { displayNameOf } from "@/lib/display-name";

import { checkAgain as checkAgainRequest, fetchFeed, writeNote } from "./api";
import { FeedEmpty, FeedError, FeedLoading } from "./feed-states";
import { HeldNotes } from "./held-notes";
import { Composer, ComposerPlaceholder } from "./lazy-composer";
import { NoteActions } from "./note-actions";
import { paperFor, PostNote } from "./post-note";
import { TornUpNote } from "./torn-up-note";
import { useMemberSession } from "./use-member-session";
import { applyWriteResult, tearUpNote, useMine, useReshare } from "./use-swiftter";

const SIGN_IN_URL = "/sign-in?redirect_url=%2Fswiftter";

type Feed = { status: "loading" } | { status: "error" } | { status: "ready"; items: FeedItem[]; nextCursor: string | null };

/** Every feed entry showing this Post (the Post itself, and reshares of it), changed by `update`. */
const mapPost = (items: FeedItem[], id: string, update: (post: FeedPost) => FeedPost): FeedItem[] =>
  items.map((item) => (item.post.id === id && !("tornUp" in item.post) ? ({ ...item, post: update(item.post) } as FeedItem) : item));

/** Swiftter's feed and, beside it, the composer for Members or an invitation to sign in for visitors. */
export function SwiftterBoard() {
  const { session, probe } = useMemberSession();
  const user = session.pending ? null : session.user;
  const [feed, setFeed] = useState<Feed>({ status: "loading" });
  const [feedRequest, setFeedRequest] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  // Read out politely: what changed on the page after an action.
  const [announcement, setAnnouncement] = useState("");
  const feedHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let current = true;

    fetchFeed().then((page) => {
      if (current) setFeed(page ? { status: "ready", ...page } : { status: "error" });
    });

    return () => {
      current = false;
    };
  }, [feedRequest]);

  // The signed-in Member's own view: held notes and what they reshare.
  const mine = useMine(user?.id);
  const { held, addHeld, dropHeld } = mine;
  const reshare = useReshare(
    mine,
    (id, delta) =>
      setFeed((previous) =>
        previous.status === "ready" ? { ...previous, items: mapPost(previous.items, id, (shown) => ({ ...shown, reshareCount: shown.reshareCount + delta })) } : previous,
      ),
    setAnnouncement,
  );

  const retry = () => {
    setFeed({ status: "loading" });
    setFeedRequest((count) => count + 1);
  };

  const loadMore = async () => {
    if (feed.status !== "ready" || !feed.nextCursor) return;
    setLoadingMore(true);
    const page = await fetchFeed(feed.nextCursor);

    setLoadingMore(false);
    if (!page) {
      toast.error("The next notes couldn't be read just now. Try again in a moment.");

      return;
    }
    setFeed((previous) => (previous.status === "ready" ? { status: "ready", items: [...previous.items, ...page.items], nextCursor: page.nextCursor } : previous));
    setAnnouncement(`${page.items.length} more notes loaded.`);
  };

  /** A Post just made public, first in the feed. */
  const showPost = (post: FeedPost) =>
    setFeed((previous) =>
      previous.status === "ready"
        ? { ...previous, items: [{ kind: "post", key: post.id, post }, ...previous.items] }
        : { status: "ready", items: [{ kind: "post", key: post.id, post }], nextCursor: null },
    );

  const publish = async (content: string): Promise<PublishResult> =>
    applyWriteResult(await writeNote(content), {
      approved: (post) => {
        toast.success("Note passed!");
        showPost(post);
      },
      held: addHeld,
      announce: setAnnouncement,
    });

  // Gone from the feed at once; put back if the server refuses.
  const remove = async (post: FeedPost) => {
    await tearUpNote(post.id, () => {
      const before = feed;

      setFeed((previous) =>
        previous.status === "ready"
          ? {
              ...previous,
              items: previous.items
                .filter((item) => !(item.kind === "post" && item.post.id === post.id))
                .map((item): FeedItem => (item.kind === "reshare" && item.post.id === post.id ? { ...item, post: { id: post.id, tornUp: true } } : item)),
            }
          : previous,
      );
      // Its "tear up" button is gone with it: keep the keyboard in the feed.
      feedHeading.current?.focus();

      return () => setFeed(before);
    });
  };

  const tearUpHeld = async (note: HeldNote) => {
    await tearUpNote(note.id, () => {
      dropHeld(note.id);

      return () => addHeld(note);
    });
  };

  const checkHeld = async (note: HeldNote) => {
    setChecking(note.id);
    const result = await checkAgainRequest(note.id);

    setChecking(null);
    if (!result.ok) {
      toast.error(result.message);

      return;
    }
    applyWriteResult(result, {
      approved: (post) => {
        dropHeld(note.id);
        if (!note.rootId) showPost(post);
        setAnnouncement("Your note was checked and passed.");
        toast.success("Note passed!");
      },
      held: addHeld,
      announce: setAnnouncement,
    });
    if (result.status === "blocked") setAnnouncement(result.message);
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
      {probe}
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
      <aside aria-label="Write" className="lg:sticky lg:top-8 lg:order-2 lg:self-start">
        {session.pending ? (
          <ComposerPlaceholder />
        ) : user ? (
          <Composer member={{ name: displayNameOf(user), avatarUrl: user.image || null }} onPublish={publish} />
        ) : (
          <GuestbookPrompt />
        )}
      </aside>

      <section aria-labelledby="swiftter-feed" className="min-w-0 lg:order-1">
        {user && <HeldNotes checking={checking} notes={held} onCheckAgain={checkHeld} onTearUp={tearUpHeld} />}
        <h2 ref={feedHeading} className="sr-only" id="swiftter-feed" tabIndex={-1}>
          Posts
        </h2>
        {feed.status === "loading" && <FeedLoading />}
        {feed.status === "error" && <FeedError onRetry={retry} />}
        {feed.status === "ready" && feed.items.length === 0 && <FeedEmpty action={user ? undefined : <GuestbookLink />} />}
        {feed.status === "ready" && feed.items.length > 0 && (
          <>
            <div aria-busy={loadingMore} aria-label="Posts" className="flex flex-col gap-9 sm:gap-11" role="feed">
              {feed.items.map((item, index) => {
                const paper = paperFor(index, feed.items.length);

                if ("tornUp" in item.post) {
                  return <TornUpNote key={item.key} paper={paper} resharedBy={item.kind === "reshare" ? item.resharedBy.displayName : undefined} />;
                }

                const post = item.post;
                const own = !!user && post.author.id === user.id;

                return (
                  <PostNote
                    key={item.key}
                    banner={item.kind === "reshare" ? <ReshareBanner name={item.resharedBy.displayName} /> : undefined}
                    footer={
                      <NoteActions
                        authorName={post.author.displayName}
                        postId={post.id}
                        replyCount={post.replyCount}
                        reshare={user && !own ? { reshared: mine.reshared.has(post.id), busy: reshare.busy === post.id, onToggle: () => reshare.toggle(post) } : undefined}
                        reshareCount={post.reshareCount}
                      />
                    }
                    paper={paper}
                    post={post}
                    onDelete={own && item.kind === "post" ? () => remove(post) : undefined}
                  />
                );
              })}
            </div>
            {feed.nextCursor && (
              <div className="mt-10 flex justify-center">
                <button
                  aria-busy={loadingMore}
                  className="font-hand focus-ring decoration-pen min-h-11 rounded-sm px-2 text-[25px] font-bold underline decoration-wavy decoration-[1.5px] underline-offset-[5px] disabled:opacity-60"
                  disabled={loadingMore}
                  type="button"
                  onClick={loadMore}
                >
                  {loadingMore ? "turning the page…" : "older notes →"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** Above a reshared note: who passed it on. */
function ReshareBanner({ name }: { name: string }) {
  return (
    <p className="font-hand relative pt-3 pl-[78px] text-[19px] leading-none font-bold opacity-80">
      <span aria-hidden="true">↻ </span>
      {name} reshared
    </p>
  );
}

function GuestbookLink() {
  return (
    <IntentLink
      className="font-hand focus-ring decoration-pen rounded-sm text-[25px] leading-snug font-bold underline decoration-wavy decoration-[1.5px] underline-offset-[5px]"
      href={SIGN_IN_URL}
    >
      sign the guestbook to pass a{" "}
      <span className="whitespace-nowrap">
        note <span aria-hidden="true">→</span>
      </span>
    </IntentLink>
  );
}

/** What visitors see instead of the composer: an invitation, on kraft paper. */
function GuestbookPrompt() {
  return (
    <div className="bg-kraft paper-grain relative rotate-[1.2deg] px-6 pt-9 pb-8 text-[#2b1d14] shadow-[0_1px_2px_rgba(0,0,0,.12),0_18px_30px_-16px_rgba(40,20,10,.55)]">
      <WashiTape className="-top-3 left-1/2 -translate-x-1/2" rotate={-3} width={96} />
      <h2 className="font-hand text-[30px] leading-none font-bold">Want to pass a note?</h2>
      <p className="mt-3 text-[16px] leading-relaxed">
        Members write on Swiftter; everyone can read. Signing in takes a minute, and your name goes in the guestbook.
      </p>
      <p className="mt-5">
        <GuestbookLink />
      </p>
    </div>
  );
}
