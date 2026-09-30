"use client";

import type { PublishResult } from "./composer";
import type { FeedPost, HeldNote } from "@/lib/swiftter";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { fetchMine, type NoteResult, setReshared, tearUp } from "./api";

/*
  What the feed (swiftter-board.tsx) and a thread (thread-view.tsx) both do
  with a Member's notes: read their own view, reshare, tear up, and turn the
  answer to a note written or checked again into what the page shows. One
  copy, so the two pages cannot drift apart again.
*/

/**
 * The signed-in Member's own view (/api/swiftter/me): their held notes and
 * the Posts they reshare. Its answer is merged, never simply applied: notes
 * written and reshares toggled on the page while it was on its way stay as
 * the Member left them.
 */
export function useMine(userId: string | undefined) {
  const [held, setHeld] = useState<HeldNote[]>([]);
  const [reshared, setResharedIds] = useState<Set<string>>(new Set());
  // Reshares toggled on this page: they win over an answer that was already on its way.
  const toggled = useRef(new Map<string, boolean>());

  useEffect(() => {
    if (!userId) return;
    let current = true;

    fetchMine().then((mine) => {
      if (!current || !mine) return;
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

  const addHeld = useCallback((note: HeldNote) => setHeld((previous) => [note, ...previous.filter((other) => other.id !== note.id)]), []);
  const dropHeld = useCallback((id: string) => setHeld((previous) => previous.filter((other) => other.id !== id)), []);
  const markReshared = useCallback((id: string, on: boolean) => {
    toggled.current.set(id, on);
    setResharedIds((previous) => {
      const next = new Set(previous);

      if (on) next.add(id);
      else next.delete(id);

      return next;
    });
  }, []);

  return { held, addHeld, dropHeld, reshared, markReshared };
}

export type Mine = ReturnType<typeof useMine>;

/**
 * Resharing a Post, or undoing it: shown at once (pressed, counted), put back
 * if the server refuses. `onCount` moves the Post's count wherever the page
 * shows it; `announce` reads the outcome out.
 */
export function useReshare(mine: Pick<Mine, "reshared" | "markReshared">, onCount: (id: string, delta: number) => void, announce: (message: string) => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const { reshared, markReshared } = mine;

  const toggle = async (post: Pick<FeedPost, "id" | "author">) => {
    // The button stays focusable while its request is out (aria-disabled): a second press does nothing.
    if (busy) return;
    const on = !reshared.has(post.id);

    setBusy(post.id);
    markReshared(post.id, on);
    onCount(post.id, on ? 1 : -1);
    const result = await setReshared(post.id, on);

    setBusy(null);
    if (result.ok) {
      announce(on ? `Reshared ${post.author.displayName}'s note.` : `Stopped resharing ${post.author.displayName}'s note.`);

      return;
    }
    markReshared(post.id, !on);
    onCount(post.id, on ? -1 : 1);
    toast.error(result.message);
  };

  return { busy, toggle };
}

/**
 * Tearing up one of the Member's notes: `hide` takes it off the page at once
 * and returns how to put it back, which happens if the server refuses.
 * Resolves whether it was torn up.
 */
export async function tearUpNote(id: string, hide: () => () => void): Promise<boolean> {
  const putBack = hide();
  const result = await tearUp(id);

  if (result.ok) {
    toast.success("Note torn up.");

    return true;
  }
  putBack();
  toast.error(result.message);

  return false;
}

type WriteHandlers = {
  /** Moderation passed it: it is public. */
  approved: (note: FeedPost) => void;
  /** Kept for its author only: waiting for a check, or refused. */
  held: (note: HeldNote) => void;
  /** Read out once, for the outcomes the page shows no other way. */
  announce: (message: string) => void;
};

/**
 * What the composer (or "check again") should do with the answer to a note
 * written: approved, it is public; pending, the composer is cleared and the
 * note waits in the Member's margin; refused, the reason is written on the
 * composer and the text stays to rework. Each outcome is announced once.
 */
export function applyWriteResult(result: NoteResult, on: WriteHandlers): PublishResult {
  if (!result.ok) return { published: false, message: result.message };
  if (result.status === "approved") {
    on.approved(result.note);

    return { published: true };
  }
  on.held(result.note);
  if (result.status === "pending") {
    on.announce(result.message);

    return { published: true };
  }

  return { published: false, message: result.message };
}

/**
 * Moves keyboard focus to the element with this id once the page has
 * re-rendered (the note it names may only just have been added). Used where
 * an action removes or adds what the Member was on, so focus never falls back
 * to the top of the page.
 */
export function useFocusAfterRender() {
  const target = useRef<string | null>(null);
  const [request, setRequest] = useState(0);

  useEffect(() => {
    if (!target.current) return;
    const element = document.getElementById(target.current);

    target.current = null;
    element?.focus();
  }, [request]);

  return useCallback((id: string) => {
    target.current = id;
    setRequest((count) => count + 1);
  }, []);
}

/** A note's element id on the page (its article, focusable from script): by feed entry on the feed, by note in a thread. */
export const noteElementId = (id: string) => `note-${id}`;

/** A held note's element id, in the Member's margin or under its parent in a thread. */
export const heldElementId = (id: string) => `held-${id}`;
