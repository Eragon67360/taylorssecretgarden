"use client";

import type { PublishResult } from "./composer";
import type { FeedItem, FeedPost, HeldNote } from "@/lib/swiftter";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { IntentLink } from "@/components/intent-link";
import { WashiTape } from "@/components/scrapbook";
import { displayNameOf } from "@/lib/display-name";

import { checkAgain as checkAgainRequest, fetchFeed, fetchMine, setReshared, tearUp, writeNote } from "./api";
import { FeedEmpty, FeedError, FeedLoading } from "./feed-states";
import { HeldNotes } from "./held-notes";
import { NoteActions } from "./note-actions";
import { NoteSheet, PAPERS, ruling } from "./note-paper";
import { paperFor, PostNote } from "./post-note";
import { TornUpNote } from "./torn-up-note";
import { useMemberSession } from "./use-member-session";

const SIGN_IN_URL = "/sign-in?redirect_url=%2Fswiftter";

// Only Members write, so visitors never download the editor.
const Composer = dynamic(() => import("@/components/swiftter/composer"), { loading: () => <ComposerPlaceholder /> });

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
  const [held, setHeld] = useState<HeldNote[]>([]);
  const [reshared, setResharedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  // Read out politely: what changed on the page after an action.
  const [announcement, setAnnouncement] = useState("");
  const feedHeading = useRef<HTMLHeadingElement>(null);
  // Reshares toggled on this page: they win over an answer from /api/swiftter/me that was already on its way.
  const toggled = useRef(new Map<string, boolean>());

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
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let current = true;

    fetchMine().then((mine) => {
      if (!current || !mine) return;
      // Merged, not replaced: notes written or reshares toggled meanwhile stay.
      setHeld((previous) => [...previous.filter((note) => !mine.held.some((other) => other.id === note.id)), ...mine.held]);
      const next = new Set(mine.reshared);

      for (const [id, on] of toggled.current) {
        if (on) next.add(id);
        else next.delete(id);
      }
      setResharedIds(next);
    });

    return () => {
      current = false;
    };
  }, [userId]);

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

  const addHeld = (note: HeldNote) => setHeld((previous) => [note, ...previous.filter((other) => other.id !== note.id)]);

  const publish = async (content: string): Promise<PublishResult> => {
    const result = await writeNote(content);

    if (!result.ok) return { published: false, message: result.message };
    if (result.status === "approved") {
      const post = result.note;

      toast.success("Note passed!");
      setFeed((previous) =>
        previous.status === "ready" ? { ...previous, items: [{ kind: "post", key: post.id, post }, ...previous.items] } : { status: "ready", items: [{ kind: "post", key: post.id, post }], nextCursor: null },
      );

      return { published: true };
    }

    addHeld(result.note);
    if (result.status === "pending") {
      // Kept and waiting: the composer is cleared, the note is in the Member's margin.
      toast.info("Your note is saved and waiting for a check.");
      setAnnouncement(result.message);

      return { published: true };
    }

    // Refused: the reason is written on the note and the text stays to rework.
    return { published: false, message: result.message };
  };

  const toggleReshare = async (post: FeedPost) => {
    const on = !reshared.has(post.id);
    const change = (delta: number, has: boolean) => {
      setResharedIds((previous) => {
        const next = new Set(previous);

        if (has) next.add(post.id);
        else next.delete(post.id);

        return next;
      });
      setFeed((previous) => (previous.status === "ready" ? { ...previous, items: mapPost(previous.items, post.id, (shown) => ({ ...shown, reshareCount: shown.reshareCount + delta })) } : previous));
    };

    setBusy(post.id);
    toggled.current.set(post.id, on);
    change(on ? 1 : -1, on);
    const result = await setReshared(post.id, on);

    setBusy(null);
    if (result.ok) {
      setAnnouncement(on ? `Reshared ${post.author.displayName}'s note.` : `Stopped resharing ${post.author.displayName}'s note.`);

      return;
    }
    toggled.current.set(post.id, !on);
    change(on ? -1 : 1, !on);
    toast.error(result.message);
  };

  // Gone from the feed at once; put back if the server refuses.
  const remove = async (post: FeedPost) => {
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

    const result = await tearUp(post.id);

    if (result.ok) {
      toast.success("Note torn up.");

      return;
    }
    setFeed(before);
    toast.error(result.message);
  };

  const tearUpHeld = async (note: HeldNote) => {
    setHeld((previous) => previous.filter((other) => other.id !== note.id));
    const result = await tearUp(note.id);

    if (result.ok) {
      toast.success("Note torn up.");

      return;
    }
    addHeld(note);
    toast.error(result.message);
  };

  const checkHeld = async (note: HeldNote) => {
    setChecking(note.id);
    const result = await checkAgainRequest(note.id);

    setChecking(null);
    if (!result.ok) {
      toast.error(result.message);

      return;
    }
    if (result.status === "approved") {
      const post = result.note;

      setHeld((previous) => previous.filter((other) => other.id !== note.id));
      if (!note.rootId) setFeed((previous) => (previous.status === "ready" ? { ...previous, items: [{ kind: "post", key: post.id, post }, ...previous.items] } : previous));
      setAnnouncement("Your note was checked and passed.");
      toast.success("Note passed!");

      return;
    }
    addHeld(result.note);
    setAnnouncement(result.message);
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
                const mine = !!user && post.author.id === user.id;

                return (
                  <PostNote
                    key={item.key}
                    banner={item.kind === "reshare" ? <ReshareBanner name={item.resharedBy.displayName} /> : undefined}
                    footer={
                      <NoteActions
                        authorName={post.author.displayName}
                        postId={post.id}
                        replyCount={post.replyCount}
                        reshare={user && !mine ? { reshared: reshared.has(post.id), busy: busy === post.id, onToggle: () => toggleReshare(post) } : undefined}
                        reshareCount={post.reshareCount}
                      />
                    }
                    paper={paper}
                    post={post}
                    onDelete={mine && item.kind === "post" ? () => remove(post) : undefined}
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

/** Blank lined paper the size of the composer, while it (or the sign-in state) loads. */
function ComposerPlaceholder() {
  return (
    <div aria-hidden="true" className="relative h-[340px]" style={{ rotate: `${PAPERS.lined.tilt}deg` }}>
      <NoteSheet paper="lined" />
      <div className="relative mt-[76px] h-[224px]" style={ruling("lined")} />
    </div>
  );
}
