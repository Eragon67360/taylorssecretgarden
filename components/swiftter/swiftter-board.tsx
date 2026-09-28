"use client";

import type { FeedPost } from "@/service/swiftter";
import type { SessionState } from "./session-probe";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { IntentLink } from "@/components/intent-link";
import { WashiTape } from "@/components/scrapbook";
import { mayBeMember } from "@/lib/auth/member-hint";
import { displayNameOf } from "@/lib/display-name";

import { FeedEmpty, FeedError, FeedLoading } from "./feed-states";
import { NoteSheet, PAPERS, ruling } from "./note-paper";
import { paperFor, PostNote } from "./post-note";

const FEED_URL = "/api/swiftter/posts";
const SIGN_IN_URL = "/sign-in?redirect_url=%2Fswiftter";

// Only Members write, so visitors never download the editor, nor Neon Auth's
// client: the session is asked for with one small request first (lib/auth/member-hint.ts).
const Composer = dynamic(() => import("@/components/swiftter/composer"), { loading: () => <ComposerPlaceholder /> });
const SessionProbe = dynamic(() => import("./session-probe"), { ssr: false });

type Feed = { status: "loading" } | { status: "error" } | { status: "ready"; posts: FeedPost[] };

async function fetchFeed(): Promise<Feed> {
  try {
    const response = await fetch(FEED_URL, { cache: "no-store" });

    if (!response.ok) return { status: "error" };
    const { posts } = (await response.json()) as { posts?: unknown };

    return Array.isArray(posts) ? { status: "ready", posts: posts as FeedPost[] } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

/** Swiftter's feed and, beside it, the composer for Members or an invitation to sign in for visitors. */
export function SwiftterBoard() {
  const [probe, setProbe] = useState(false);
  const [session, setSession] = useState<SessionState>({ pending: true });
  const user = session.pending ? null : session.user;
  const [feed, setFeed] = useState<Feed>({ status: "loading" });
  const [feedRequest, setFeedRequest] = useState(0);

  // Neon Auth's client only when someone may be signed in; otherwise a visitor.
  useEffect(() => {
    let current = true;

    mayBeMember().then((maybe) => {
      if (!current) return;
      if (maybe) setProbe(true);
      else setSession({ pending: false, user: null });
    });

    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    let current = true;

    fetchFeed().then((result) => {
      if (current) setFeed(result);
    });

    return () => {
      current = false;
    };
  }, [feedRequest]);

  const retry = () => {
    setFeed({ status: "loading" });
    setFeedRequest((count) => count + 1);
  };

  const publish = async (content: string) => {
    try {
      const response = await fetch(FEED_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await response.json().catch(() => ({}))) as { post?: FeedPost; error?: string };

      if (!response.ok || !data.post) {
        toast.error(data.error ?? "Your Post could not be published.");

        return false;
      }

      const post = data.post;

      toast.success("Note passed!");
      setFeed((previous) => ({ status: "ready", posts: [post, ...(previous.status === "ready" ? previous.posts : [])] }));

      return true;
    } catch {
      toast.error("Your Post could not be published.");

      return false;
    }
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
      {probe && <SessionProbe onChange={setSession} />}
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
        <h2 className="sr-only" id="swiftter-feed">
          Posts
        </h2>
        {feed.status === "loading" && <FeedLoading />}
        {feed.status === "error" && <FeedError onRetry={retry} />}
        {feed.status === "ready" && feed.posts.length === 0 && <FeedEmpty action={user ? undefined : <GuestbookLink />} />}
        {feed.status === "ready" && feed.posts.length > 0 && (
          <div aria-label="Posts" className="flex flex-col gap-9 sm:gap-11" role="feed">
            {feed.posts.map((post, index) => (
              <PostNote key={post.id} paper={paperFor(index, feed.posts.length)} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
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
