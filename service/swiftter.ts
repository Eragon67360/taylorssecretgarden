import "server-only";

import { and, desc, eq, gt } from "drizzle-orm";

import { getDb } from "@/db/client";
import { displayNameOf } from "@/lib/display-name";
import { members, posts } from "@/db/schema";
import { postText, sanitisePostHtml } from "@/service/post-html";

/**
 * Swiftter's data: the feed of Posts and the Members who publish them. All
 * database access for Swiftter goes through this module.
 */

/** A Post as the feed shows it, with its author. */
export type FeedPost = {
	id: string;
	content: string;
	isDemo: boolean;
	createdAt: string;
	author: { displayName: string; username: string | null; avatarUrl: string | null };
};

/** What Swiftter keeps about a Member, copied from their Neon Auth user. */
export type MemberDetails = {
	id: string;
	displayName: string;
	username: string | null;
	avatarUrl: string | null;
};

/** Content that cannot be published: empty once sanitised, or too long. */
export class InvalidPostError extends Error {}

const MAX_CONTENT_LENGTH = 10_000;

const feedColumns = {
	id: posts.id,
	content: posts.content,
	isDemo: posts.isDemo,
	createdAt: posts.createdAt,
	displayName: members.displayName,
	username: members.username,
	avatarUrl: members.avatarUrl,
};

function selectFeedPosts() {
	return getDb().select(feedColumns).from(posts).innerJoin(members, eq(posts.memberId, members.id));
}

type FeedRow = Awaited<ReturnType<typeof selectFeedPosts>>[number];

// Every Post leaves the server sanitised, including rows written some other way
// than publishPost, so the browser renders feed HTML as is (and never downloads
// the sanitiser).
function toFeedPost({ displayName, username, avatarUrl, createdAt, content, ...post }: FeedRow): FeedPost {
	return { ...post, content: sanitisePostHtml(content), createdAt: createdAt.toISOString(), author: { displayName, username, avatarUrl } };
}

/** The newest Posts first, each with its Member. */
export async function listFeed(): Promise<FeedPost[]> {
	const rows = await selectFeedPosts().orderBy(desc(posts.createdAt));

	return rows.map(toFeedPost);
}

/** Creates the Member, or refreshes their name and avatar if they changed since. */
export async function ensureMember(member: MemberDetails): Promise<void> {
	const { displayName, username, avatarUrl } = member;

	await getDb()
		.insert(members)
		.values(member)
		.onConflictDoUpdate({ target: members.id, set: { displayName, username, avatarUrl } });
}

/** The person signed in, as Neon Auth describes them (lib/auth/server.ts). */
export type AuthUser = { id: string; name?: string | null; email: string; image?: string | null };

/**
 * The Member details of a signed-in person. Neon Auth has no usernames, so a
 * Member's handle is left empty.
 */
export function memberFromAuthUser(user: AuthUser): MemberDetails {
	return {
		id: user.id,
		displayName: displayNameOf(user),
		username: null,
		avatarUrl: user.image || null,
	};
}

/** How many Posts a Member may publish within a window of time. */
export const POSTING_LIMIT = { posts: 5, minutes: 10 } as const;

/**
 * When the Member may publish their next Post: null if now, otherwise the
 * moment the oldest of their last POSTING_LIMIT.posts Posts leaves the window.
 * Counted in Postgres; two Posts sent at the same instant may both slip
 * through, which is fine for a flood limit.
 */
export async function nextPostAllowedAt(memberId: string, now = new Date()): Promise<Date | null> {
	const windowMs = POSTING_LIMIT.minutes * 60_000;
	const recent = await getDb()
		.select({ createdAt: posts.createdAt })
		.from(posts)
		.where(and(eq(posts.memberId, memberId), gt(posts.createdAt, new Date(now.getTime() - windowMs))))
		.orderBy(desc(posts.createdAt))
		.limit(POSTING_LIMIT.posts);

	if (recent.length < POSTING_LIMIT.posts) return null;

	return new Date(recent[recent.length - 1].createdAt.getTime() + windowMs);
}

/** Publishes a Post as the given Member; throws InvalidPostError if there is nothing to publish. */
export async function publishPost(memberId: string, html: string): Promise<FeedPost> {
	// Checked on the raw HTML, before any parsing.
	if (html.length > MAX_CONTENT_LENGTH) throw new InvalidPostError("This Post is too long.");

	const content = sanitisePostHtml(html);

	if (!postText(content)) throw new InvalidPostError("A Post needs some text.");

	const [{ id }] = await getDb().insert(posts).values({ memberId, content }).returning({ id: posts.id });
	const [row] = await selectFeedPosts().where(eq(posts.id, id));

	return toFeedPost(row);
}
