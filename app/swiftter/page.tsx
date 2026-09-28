"use client";

import type { FeedPost } from "@/service/swiftter";

import { SignOutButton, useUser } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PressedFlower, Scribble, WashiTape } from "@/components/scrapbook";
import { FeedEmpty, FeedError, FeedLoading } from "@/components/swiftter/feed-states";
import { paperFor, PostNote } from "@/components/swiftter/post-note";

const FEED_URL = "/api/swiftter/posts";
const SIGN_IN_URL = "/sign-in?redirect_url=%2Fswiftter";

// Only Members write, so visitors never download the editor.
const Composer = dynamic(() => import("@/components/swiftter/composer"), { loading: () => <ComposerPlaceholder /> });

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

export default function SwiftterPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [feed, setFeed] = useState<Feed>({ status: "loading" });
  const [feedRequest, setFeedRequest] = useState(0);

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
    <div className="relative mx-auto w-full max-w-[1120px] overflow-x-clip px-4 pt-10 pb-20 sm:px-8 sm:pt-14">
      <header className="relative mb-12 max-w-[40rem] sm:mb-16">
        <PressedFlower
          className="absolute top-2 -right-3 h-36 w-20 rotate-[22deg] sm:-right-24 sm:h-48 sm:w-28"
          color="#9ab3d6"
          kind="lavender"
        />
        <p className="font-hand text-accent text-[24px] font-bold">page 4 · notes passed in class</p>
        <h1 className="font-serif relative inline-block text-[64px] leading-[0.95] font-semibold tracking-tight sm:text-[88px]">
          Swiftter
          <Scribble className="absolute -bottom-2 left-0 h-4 w-full" color="var(--pen)" />
        </h1>
        <p className="text-soft mt-6 max-w-[34rem] pr-16 text-[17px] leading-relaxed sm:pr-0">
          The fan feed. Theories, easter eggs, 3am thoughts, scribbled on whatever paper was closest. Be kind, or at least be
          reputation about it.
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
        <aside aria-label="Write" className="lg:sticky lg:top-8 lg:order-2 lg:self-start">
          {!isLoaded ? (
            <ComposerPlaceholder />
          ) : isSignedIn ? (
            <Composer
              member={{ name: user.fullName || user.username || "Swiftie", avatarUrl: user.imageUrl || null }}
              memberActions={
                <SignOutButton redirectUrl="/swiftter">
                  <button className="focus-ring min-h-9 rounded-[6px] px-1 text-[14px] font-bold underline underline-offset-2" type="button">
                    Sign out
                  </button>
                </SignOutButton>
              }
              onPublish={publish}
            />
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
          {feed.status === "ready" && feed.posts.length === 0 && <FeedEmpty action={isSignedIn ? undefined : <GuestbookLink />} />}
          {feed.status === "ready" && feed.posts.length > 0 && (
            <div aria-label="Posts" className="flex flex-col gap-9 sm:gap-11" role="feed">
              {feed.posts.map((post, index) => (
                <PostNote key={post.id} paper={paperFor(index)} post={post} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function GuestbookLink() {
  return (
    <Link
      className="font-hand focus-ring decoration-pen rounded-sm text-[25px] leading-snug font-bold underline decoration-wavy decoration-[1.5px] underline-offset-[5px]"
      href={SIGN_IN_URL}
    >
      sign the guestbook to pass a{" "}
      <span className="whitespace-nowrap">
        note <span aria-hidden="true">→</span>
      </span>
    </Link>
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
    <div
      aria-hidden="true"
      className="h-[340px] rotate-[-0.7deg] bg-[#fffefa] shadow-[0_10px_20px_-12px_rgba(40,20,10,.35)]"
      style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0 27px, #bcd3e6 27px 28px)", backgroundPosition: "0 76px" }}
    />
  );
}
