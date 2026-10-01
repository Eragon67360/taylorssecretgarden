import type { FeedPage, FeedPost, HeldNote, ModerationAction, ModerationItem, RefusalCategory } from "@/lib/swiftter";

/*
  Swiftter's API, as the browser calls it (app/api/swiftter). Every call
  resolves; failures come back as a message for the Member, never a throw.
*/

const FEED_URL = "/api/swiftter/posts";

/** Writes go out as JSON: the routes refuse anything else (lib/member-write.ts). */
const JSON_HEADERS = { "Content-Type": "application/json" };

const CONNECTION = "That didn't go through. Check your connection and try again.";

type Failure = { ok: false; message: string; status: number };

async function failure(response: Response, fallback: string): Promise<Failure> {
  const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };

  return { ok: false, message: data.message ?? data.error ?? fallback, status: response.status };
}

/** One page of notes from `url` (`cursor` from the previous page's `nextCursor`), or null if it could not be read. */
async function fetchPage(url: string, cursor?: string | null): Promise<FeedPage | null> {
  try {
    const response = await fetch(cursor ? `${url}?cursor=${encodeURIComponent(cursor)}` : url, { cache: "no-store" });

    if (!response.ok) return null;
    const page = (await response.json()) as Partial<FeedPage>;

    return Array.isArray(page.items) ? { items: page.items, nextCursor: page.nextCursor ?? null } : null;
  } catch {
    return null;
  }
}

/** One page of the feed, or null if it could not be read. */
export const fetchFeed = (cursor?: string | null) => fetchPage(FEED_URL, cursor);

/** One page of a Member's Posts, for their page, or null if it could not be read. */
export const fetchMemberPosts = (memberId: string, cursor: string) => fetchPage(`/api/swiftter/members/${encodeURIComponent(memberId)}/posts`, cursor);

/**
 * How many replies others wrote to the signed-in Member's notes since `since`
 * (an earlier answer's `at`; none starts counting now), the `at` to send
 * next, and whether they are a moderator; null if it could not be read.
 */
export async function fetchNewReplies(since: string | null): Promise<{ count: number; at: string; moderator: boolean } | null> {
  try {
    const response = await fetch(since ? `/api/swiftter/me/replies?since=${encodeURIComponent(since)}` : "/api/swiftter/me/replies", { cache: "no-store" });

    return response.ok ? ((await response.json()) as { count: number; at: string; moderator: boolean }) : null;
  } catch {
    return null;
  }
}

/** What only the signed-in Member sees: their held notes and the Posts they reshare. */
export async function fetchMine(): Promise<{ held: HeldNote[]; reshared: string[] } | null> {
  try {
    const response = await fetch("/api/swiftter/me", { cache: "no-store" });

    return response.ok ? ((await response.json()) as { held: HeldNote[]; reshared: string[] }) : null;
  } catch {
    return null;
  }
}

/** What happened to a note written or checked again. */
export type NoteResult =
  | { ok: true; status: "approved"; note: FeedPost }
  | { ok: true; status: "pending"; note: HeldNote; message: string }
  | { ok: true; status: "blocked"; note: HeldNote; category: RefusalCategory; message: string }
  | Failure;

async function noteResult(request: Promise<Response>, fallback: string): Promise<NoteResult> {
  try {
    const response = await request;

    if (response.status === 201 || response.status === 202 || response.status === 422) {
      const data = (await response.json()) as Exclude<NoteResult, Failure> | { error: string };

      if ("status" in data) return { ...data, ok: true } as NoteResult;
    }

    return failure(response, fallback);
  } catch {
    return { ok: false, message: CONNECTION, status: 0 };
  }
}

/** Writes a note: a Post, or a reply to `parentId`. */
export const writeNote = (content: string, parentId?: string) =>
  noteResult(
    fetch(FEED_URL, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(parentId ? { content, parentId } : { content }) }),
    "Your note couldn't be passed just now. Try again in a moment.",
  );

/** "Check again" on one of your pending notes. */
export const checkAgain = (id: string) =>
  noteResult(fetch(`${FEED_URL}/${id}/check`, { method: "POST" }), "Your note couldn't be checked just now. Try again in a moment.");

/** Reshares a Post (`on`), or undoes it. */
export async function setReshared(postId: string, on: boolean): Promise<{ ok: true } | Failure> {
  try {
    const response = await fetch(`${FEED_URL}/${postId}/reshare`, { method: on ? "POST" : "DELETE" });

    return response.ok ? { ok: true } : failure(response, on ? "That note couldn't be reshared just now." : "The reshare couldn't be undone just now.");
  } catch {
    return { ok: false, message: CONNECTION, status: 0 };
  }
}

/** Tears up one of your notes. A 404 means it was already gone (torn up in another tab). */
export async function tearUp(id: string): Promise<{ ok: true } | Failure> {
  try {
    const response = await fetch(`${FEED_URL}/${id}`, { method: "DELETE" });

    return response.ok || response.status === 404 ? { ok: true } : failure(response, "That note couldn't be torn up just now. Try again in a moment.");
  } catch {
    return { ok: false, message: CONNECTION, status: 0 };
  }
}

/** Reports someone else's public note for a human to look at, with an optional reason. `already`: you had reported it before. */
export async function reportNote(id: string, reason: string): Promise<{ ok: true; already: boolean } | Failure> {
  try {
    const response = await fetch(`${FEED_URL}/${id}/report`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(reason.trim() ? { reason } : {}) });

    return response.ok ? { ok: true, already: response.status === 200 } : failure(response, "That note couldn't be reported just now. Try again in a moment.");
  } catch {
    return { ok: false, message: CONNECTION, status: 0 };
  }
}

/** The moderation page's list, read again (moderators only), or null if it could not be read. */
export async function fetchModerationQueue(): Promise<{ items: ModerationItem[]; total: number } | null> {
  try {
    const response = await fetch("/api/swiftter/moderation", { cache: "no-store" });

    return response.ok ? ((await response.json()) as { items: ModerationItem[]; total: number }) : null;
  } catch {
    return null;
  }
}

/**
 * A moderator's decision on a note, with their optional note for the record.
 * `handled`: someone got there first (409), so the note leaves the list all
 * the same, and `message` says why.
 */
export async function decideOnNote(id: string, action: ModerationAction, note: string): Promise<{ ok: true } | (Failure & { handled: boolean })> {
  try {
    const response = await fetch(`/api/swiftter/moderation/${id}`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(note.trim() ? { action, note } : { action }),
    });

    if (response.ok) return { ok: true };

    return { ...(await failure(response, "That decision couldn't be recorded just now. Try again in a moment.")), handled: response.status === 409 };
  } catch {
    return { ok: false, message: CONNECTION, status: 0, handled: false };
  }
}

/** "Ask a human to look again" at one of your refused notes. `already`: you had asked before. */
export async function appealNote(id: string): Promise<{ ok: true; already: boolean } | Failure> {
  try {
    const response = await fetch(`${FEED_URL}/${id}/appeal`, { method: "POST" });

    return response.ok ? { ok: true, already: response.status === 200 } : failure(response, "That couldn't be sent just now. Try again in a moment.");
  } catch {
    return { ok: false, message: CONNECTION, status: 0 };
  }
}
