import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ThreadView } from "@/components/swiftter/thread-view";
import { siteConfig } from "@/config/site";
import { isIndexable } from "@/lib/indexing";
import { pageMetadata } from "@/lib/metadata";
import { postPlainText } from "@/service/post-html";
import { getThread as readThread } from "@/service/swiftter";

type ThreadPageProps = { params: Promise<{ id: string }> };

// The metadata and the page read the thread once per request, not twice.
const getThread = cache(readThread);

/** A note's text, shortened for a description. */
function excerpt(html: string, length = 155): string {
  const text = postPlainText(html).replace(/\s+/g, " ").trim();

  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}

export async function generateMetadata({ params }: ThreadPageProps): Promise<Metadata> {
  const thread = await getThread((await params).id);

  if (!thread) return { title: "Note not found", robots: { index: false } };

  const { root } = thread;
  const title = root.tornUp ? "A torn-up note on Swiftter" : `${root.author.displayName}'s note on Swiftter`;
  const description = root.tornUp ? "This note was torn up by its author; its replies are still here." : excerpt(root.content);
  const canonical = `/swiftter/p/${root.id}`;

  return {
    // The Swiftter layout's template adds the site's name; the card and site name are the site's.
    ...pageMetadata({ title, description, path: canonical, article: { publishedTime: root.publishedAt } }),
    // Demo, seed and torn-up notes are never indexed (docs/adr/0007), nor a
    // thread below the indexing bar (service/swiftter.ts); outside production
    // the layout already keeps everything out (lib/indexing.ts): a `robots`
    // key here, even undefined, would replace the layout's noindex.
    ...(isIndexable() && !thread.indexable && { robots: { index: false, follow: true } }),
  };
}

/**
 * A thread on Swiftter: its first Post and every reply, rendered on the
 * server so it reads (and indexes) without JavaScript; replying, resharing and
 * tearing up come with the client. A link to a reply opens its thread on it.
 */
export default async function ThreadPage({ params }: ThreadPageProps) {
  const { id } = await params;
  const thread = await getThread(id);

  if (!thread) notFound();

  const url = `${siteConfig.url}/swiftter/p/${thread.root.id}`;
  const person = (name: string) => ({ "@type": "Person", name });
  const structured = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    url,
    headline: thread.root.tornUp ? "A torn-up note" : excerpt(thread.root.content, 110),
    text: thread.root.tornUp ? undefined : postPlainText(thread.root.content),
    // A torn-up note has no author any more (NO_AUTHOR).
    author: thread.root.tornUp ? undefined : person(thread.root.author.displayName),
    datePublished: thread.root.publishedAt,
    isPartOf: { "@type": "WebPage", url: `${siteConfig.url}/swiftter`, name: "Swiftter" },
    commentCount: thread.replies.filter((reply) => !reply.tornUp).length,
    comment: thread.replies
      .filter((reply) => !reply.tornUp)
      .map((reply) => ({ "@type": "Comment", text: postPlainText(reply.content), author: person(reply.author.displayName), datePublished: reply.publishedAt })),
  };

  return (
    <div className="relative mx-auto w-full max-w-[760px] overflow-x-clip px-4 pt-10 pb-20 sm:px-8 sm:pt-14">
      <script
        // Escaped so a note's text can never close the script element.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }}
        type="application/ld+json"
      />
      <p>
        <Link className="font-hand focus-ring text-accent rounded-sm text-[22px] font-bold underline underline-offset-4" href="/swiftter">
          <span aria-hidden="true">← </span>all notes
        </Link>
      </p>
      <h1 className="font-serif mt-4 mb-10 text-[44px] leading-[1.05] font-semibold tracking-tight sm:text-[56px]">
        {thread.root.tornUp ? "A torn-up note" : `A note from ${thread.root.author.displayName}`}
      </h1>
      <ThreadView focusId={id} thread={thread} />
    </div>
  );
}
