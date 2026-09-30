/*
  Swiftter's shared vocabulary: the shapes the API returns and the limits,
  for the server (service/swiftter.ts) and the browser (components/swiftter)
  alike. No server code here.
*/

/** A Member as a note shows them. */
export type Author = { id: string; displayName: string; username: string | null; avatarUrl: string | null };

/**
 * A torn-up note's author, as a thread shows it: nobody. Tearing a note up
 * takes the Member's name off it too, in the page, its structured data and
 * the thread's JSON alike.
 */
export const NO_AUTHOR: Author = { id: "", displayName: "", username: null, avatarUrl: null };

/** A public Post, as the feed and a thread show it. */
export type FeedPost = {
	id: string;
	/** Sanitised HTML. */
	content: string;
	isDemo: boolean;
	createdAt: string;
	/** When moderation approved it: the feed's order. */
	publishedAt: string;
	author: Author;
	/** Public replies in its thread. */
	replyCount: number;
	/** Members resharing it now. */
	reshareCount: number;
};

/** A Post its Member tore up, still referred to by a reshare or a reply. */
export type TornUpPost = { id: string; tornUp: true };

/** One entry of the feed: a Post, or a Member resharing one (which may since have been torn up). */
export type FeedItem =
	| { kind: "post"; key: string; post: FeedPost }
	| { kind: "reshare"; key: string; resharedAt: string; resharedBy: Author; post: FeedPost | TornUpPost };

/** A page of the feed, and the cursor for the next one (null at the end). */
export type FeedPage = { items: FeedItem[]; nextCursor: string | null };

/** Where a note stands with moderation. Only approved notes are public. */
export type NoteStatus = "pending" | "approved" | "blocked";

/** Why moderation refused a note: unkind, not safe to share (personal details, scams, sexual or illegal content, full lyrics), or off-topic. */
export type RefusalCategory = "insult" | "restricted" | "off_topic";

/** One of the signed-in Member's own notes that is not public: waiting for a check, or refused. */
export type HeldNote = {
	id: string;
	content: string;
	status: "pending" | "blocked";
	category: RefusalCategory | null;
	/** The model's reason for a refusal. */
	reason: string | null;
	/** Moderation attempts so far. */
	attempts: number;
	/** Whether "check again" is still allowed. */
	canCheckAgain: boolean;
	/**
	 * Moderation could not be reached for a whole week (MODERATION_RETRY), so
	 * the scheduled re-check gave up on it: it will never be published as it is.
	 */
	givenUp: boolean;
	createdAt: string;
	/** For a reply: its thread's first Post. */
	rootId: string | null;
};

/** A note in a thread: public, or torn up (text gone) but kept so the replies under it still read. */
export type ThreadNote = {
	id: string;
	parentId: string | null;
	/** NO_AUTHOR once torn up. */
	author: Author;
	/** Sanitised HTML; empty when torn up. */
	content: string;
	tornUp: boolean;
	isDemo: boolean;
	createdAt: string;
	publishedAt: string;
};

/** A thread: its first Post and every public (or torn-up) reply, oldest first. */
export type Thread = {
	root: ThreadNote;
	replies: ThreadNote[];
	reshareCount: number;
	/** Whether search engines may index it: a real Member's Post, not demo or seed content, not torn up. */
	indexable: boolean;
};

/** The most visible characters a note may have (graphemes: an emoji counts as one). */
export const MAX_NOTE_CHARACTERS = 1000;

/** How many of each write a Member may make in a window of time. */
export const LIMITS = {
	post: { count: 5, minutes: 10 },
	reply: { count: 10, minutes: 10 },
	reshare: { count: 10, minutes: 10 },
} as const;

export type LimitedWrite = keyof typeof LIMITS;

/**
 * Moderation attempts after which "check again" is no longer offered (every
 * attempt counts, the scheduled re-check's too). The scheduled re-check itself
 * is not capped by it: it follows MODERATION_RETRY.
 */
export const MAX_MODERATION_ATTEMPTS = 4;

/**
 * How long the scheduled re-check (hourly, vercel.json) keeps trying a note
 * that moderation gave no verdict for: at every run for its first day, then
 * once a day, then one last time a week after it was written. Only then is it
 * given up on, and its author told; an outage of a few hours strands nothing.
 */
export const MODERATION_RETRY = { hourlyForHours: 24, days: 7 } as const;

/** Visible characters in a string, as a reader counts them. */
export function characterCount(text: string): number {
	return Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text)).length;
}
