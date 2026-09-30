/*
  Swiftter's shared vocabulary: the shapes the API returns and the limits,
  for the server (service/swiftter.ts) and the browser (components/swiftter)
  alike. No server code here.
*/

/** A Member as a note shows them. */
export type Author = { id: string; displayName: string; username: string | null; avatarUrl: string | null };

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

/** Why moderation refused a note. */
export type RefusalCategory = "insult" | "off_topic";

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
	createdAt: string;
	/** For a reply: its thread's first Post. */
	rootId: string | null;
};

/** A note in a thread: public, or torn up (text gone) but kept so the replies under it still read. */
export type ThreadNote = {
	id: string;
	parentId: string | null;
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

/** Moderation attempts per note, "check again" and the scheduled re-check included. */
export const MAX_MODERATION_ATTEMPTS = 4;

/** Visible characters in a string, as a reader counts them. */
export function characterCount(text: string): number {
	return Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text)).length;
}
