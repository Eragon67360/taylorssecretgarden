"use client";

import type { PublishResult } from "./composer";
import type { HeldNote, RefusalCategory, Thread, ThreadNote } from "@/lib/swiftter";

import Link from "next/link";
import { Fragment, useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { displayNameOf } from "@/lib/display-name";

import { writeNote } from "./api";
import { Composer } from "./lazy-composer";
import { NoteActions } from "./note-actions";
import { type NotePaper } from "./note-paper";
import { PostNote } from "./post-note";
import { TornUpNote } from "./torn-up-note";
import { useMemberSession } from "./use-member-session";
import { applyWriteResult, heldElementId, noteElementId, tearUpNote, useFocusAfterRender, useMine, useReshare } from "./use-swiftter";

/** Replies indent up to this depth; deeper ones stay at it and say whom they answer. */
const MAX_INDENT = 4;

/** A reply of the Member's that moderation has not passed (yet): shown to them, under what it answers. */
type HeldReply = HeldNote & { parentId: string };

const HELD_LABEL: Record<"pending" | RefusalCategory, string> = {
  pending: "Only you can see this reply: it's waiting for a check.",
  insult: "Only you can see this reply: it wasn't passed, it reads as unkind.",
  restricted: "Only you can see this reply: it wasn't passed, it isn't safe to share.",
  off_topic: "Only you can see this reply: it wasn't passed, it's off-topic.",
};

/**
 * A thread: its first Post, then the replies, nested under what they answer.
 * Members reply under any note; visitors are invited to sign in, and come
 * back here after. A reply moderation has not passed is shown to its author
 * only, with the reason.
 */
export function ThreadView({ thread, focusId }: { thread: Thread; focusId: string }) {
  const { session, probe } = useMemberSession();
  const user = session.pending ? null : session.user;
  const [root, setRoot] = useState(thread.root);
  const [replies, setReplies] = useState<ThreadNote[]>(thread.replies);
  const [held, setHeld] = useState<HeldReply[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [reshareCount, setReshareCount] = useState(thread.reshareCount);
  const [announcement, setAnnouncement] = useState("");
  const repliesId = useId();
  const focusSoon = useFocusAfterRender();

  // What the Member reshares: the same merge as the feed, so a reshare pressed before this answers stays pressed.
  const mine = useMine(user?.id);
  const reshare = useReshare(mine, (_, delta) => setReshareCount((count) => count + delta), setAnnouncement);

  // A link to a reply lands on it.
  useEffect(() => {
    if (focusId !== thread.root.id) document.getElementById(`note-${focusId}`)?.scrollIntoView({ block: "center" });
  }, [focusId, thread.root.id]);

  const children = new Map<string, ThreadNote[]>();

  for (const reply of replies) children.set(reply.parentId!, [...(children.get(reply.parentId!) ?? []), reply]);

  const byId = new Map([root, ...replies].map((note) => [note.id, note]));
  const publicReplies = replies.filter((reply) => !reply.tornUp).length;

  const reply =
    (parent: ThreadNote) =>
    async (content: string): Promise<PublishResult> =>
      applyWriteResult(await writeNote(content, parent.id), {
        approved: (note) => {
          setReplies((previous) => [
            ...previous,
            { id: note.id, parentId: parent.id, author: note.author, content: note.content, tornUp: false, isDemo: false, createdAt: note.createdAt, publishedAt: note.publishedAt },
          ]);
          setReplyingTo(null);
          // The composer closes: the keyboard goes to the reply it wrote.
          focusSoon(noteElementId(note.id));
          toast.success("Reply passed!");
          setAnnouncement(`Your reply to ${parent.author.displayName} was passed.`);
        },
        held: (note) => {
          setHeld((previous) => [...previous.filter((other) => other.id !== note.id), { ...note, parentId: parent.id }]);
          if (note.status === "pending") focusSoon(heldElementId(note.id));
        },
        announce: (message) => {
          setReplyingTo(null);
          setAnnouncement(message);
        },
      });

  // Torn up at once (text gone, the replies under it kept); put back if the server refuses.
  const tearUp = (note: ThreadNote) => async () => {
    const replace = (next: ThreadNote) => {
      if (note.id === root.id) setRoot(next);
      else setReplies((previous) => previous.map((other) => (other.id === note.id ? next : other)));
    };

    await tearUpNote(note.id, () => {
      replace({ ...note, content: "", tornUp: true });
      // Its scrap stays in place, where the keyboard was.
      focusSoon(noteElementId(note.id));

      return () => replace(note);
    });
  };

  const signInHref = `/sign-in?redirect_url=${encodeURIComponent(`/swiftter/p/${thread.root.id}`)}`;

  /** A note's reply control and composer, for Members; nothing for visitors (one sign-in link serves the page). */
  const replyControls = (note: ThreadNote) =>
    user && !note.tornUp ? (
      <button
        aria-expanded={replyingTo === note.id}
        className="font-hand focus-ring inline-flex min-h-8 items-center rounded-sm px-1 text-[20px] leading-none font-bold underline decoration-[1.5px] underline-offset-[4px]"
        type="button"
        onClick={() => setReplyingTo((open) => (open === note.id ? null : note.id))}
      >
        reply<span className="sr-only"> to {note.author.displayName}</span>
      </button>
    ) : null;

  const composerFor = (note: ThreadNote) =>
    user && replyingTo === note.id ? (
      <div className="mt-6 max-w-[560px]">
        <Composer
          member={{ name: displayNameOf(user), avatarUrl: user.image || null }}
          placeholder="say it kindly (and about Taylor)"
          submitLabel="Reply"
          title={`Reply to ${note.author.displayName}`}
          onPublish={reply(note)}
        />
      </div>
    ) : null;

  const heldUnder = (note: ThreadNote) =>
    held
      .filter((reply) => reply.parentId === note.id)
      .map((reply) => (
        <div key={reply.id} className="focus-ring border-pen/50 bg-card mt-5 max-w-[560px] rounded-[3px] border-2 border-dashed px-4 py-3" id={heldElementId(reply.id)} role="status" tabIndex={-1}>
          <p className="text-pen text-[14.5px] font-bold">{HELD_LABEL[reply.status === "pending" ? "pending" : (reply.category ?? "insult")]}</p>
          {reply.reason && <p className="text-soft mt-1 text-[14px]">{reply.reason}</p>}
          <div dangerouslySetInnerHTML={{ __html: reply.content }} className="post-content mt-2 text-[15px]" dir="auto" />
        </div>
      ));

  const renderReplies = (parent: ThreadNote, depth: number) => {
    const list = children.get(parent.id);

    if (!list?.length) return null;

    return (
      <ol className="flex flex-col gap-7">
        {list.map((note, index) => {
          const paper: NotePaper = (depth + index) % 2 === 0 ? "sticky" : "lined";
          const indent = Math.min(depth, MAX_INDENT);
          const parent = byId.get(note.parentId!);
          const answering = depth > MAX_INDENT && parent ? (parent.tornUp ? "a torn-up note" : parent.author.displayName) : undefined;

          return (
            <li key={note.id} style={{ marginInlineStart: indent === 1 ? 0 : `${Math.min(indent - 1, MAX_INDENT) * 1.25}rem` }}>
              {note.tornUp ? (
                <TornUpNote id={noteElementId(note.id)} paper={paper} />
              ) : (
                <PostNote
                  banner={answering ? <p className="font-hand relative pt-3 pl-[78px] text-[18px] leading-none font-bold opacity-80">↳ replying to {answering}</p> : undefined}
                  footer={replyControls(note)}
                  id={noteElementId(note.id)}
                  paper={paper}
                  post={note}
                  onDelete={user && note.author.id === user.id ? tearUp(note) : undefined}
                />
              )}
              {composerFor(note)}
              {heldUnder(note)}
              <div className="mt-7">{renderReplies(note, depth + 1)}</div>
            </li>
          );
        })}
      </ol>
    );
  };

  return (
    <div className="flex flex-col gap-10">
      {probe}
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>

      {root.tornUp ? (
        <TornUpNote id={noteElementId(root.id)} paper="lined" />
      ) : (
        <PostNote
          footer={
            <Fragment>
              <NoteActions
                authorName={root.author.displayName}
                linkToThread={false}
                postId={root.id}
                replyCount={publicReplies}
                reshare={
                  user && root.author.id !== user.id
                    ? { reshared: mine.reshared.has(root.id), busy: reshare.busy === root.id, onToggle: () => reshare.toggle(root) }
                    : undefined
                }
                reshareCount={reshareCount}
              />
              {replyControls(root)}
            </Fragment>
          }
          id={noteElementId(root.id)}
          paper="lined"
          post={root}
          onDelete={user && root.author.id === user.id ? tearUp(root) : undefined}
        />
      )}
      {composerFor(root)}
      {heldUnder(root)}
      {!session.pending && !user && (
        <p>
          <Link className="font-hand focus-ring decoration-pen rounded-sm text-[25px] font-bold underline decoration-wavy decoration-[1.5px] underline-offset-[5px]" href={signInHref}>
            sign the guestbook to reply <span aria-hidden="true">→</span>
          </Link>
        </p>
      )}

      <section aria-labelledby={repliesId}>
        <h2 className="font-hand text-[30px] leading-tight font-bold" id={repliesId}>
          {publicReplies === 0 ? "No replies yet" : `${publicReplies} ${publicReplies === 1 ? "reply" : "replies"}`}
        </h2>
        <div className="mt-6">{renderReplies(root, 1)}</div>
      </section>
    </div>
  );
}
