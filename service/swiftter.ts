import "server-only";

import type { User } from "@clerk/nextjs/server";

import { desc, eq } from "drizzle-orm";
import DOMPurify from "isomorphic-dompurify";

import { getDb } from "@/db/client";
import { members, posts } from "@/db/schema";

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

/** What Swiftter keeps about a Member, taken from their Clerk profile. */
export type MemberProfile = {
	id: string;
	displayName: string;
	username: string | null;
	avatarUrl: string | null;
};

/** Content that cannot be published: empty once sanitised, or too long. */
export class InvalidPostError extends Error {}

const FEED_SIZE = 50;
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

function toFeedPost({ displayName, username, avatarUrl, createdAt, ...post }: FeedRow): FeedPost {
	return { ...post, createdAt: createdAt.toISOString(), author: { displayName, username, avatarUrl } };
}

/** The newest Posts first, each with its Member. */
export async function listFeed(): Promise<FeedPost[]> {
	const rows = await selectFeedPosts().orderBy(desc(posts.createdAt)).limit(FEED_SIZE);

	return rows.map(toFeedPost);
}

/** Creates the Member, or refreshes their name and avatar if they changed on Clerk. */
export async function ensureMember(profile: MemberProfile): Promise<void> {
	const { displayName, username, avatarUrl } = profile;

	await getDb()
		.insert(members)
		.values(profile)
		.onConflictDoUpdate({ target: members.id, set: { displayName, username, avatarUrl } });
}

/** A Member profile from the Clerk user of the current session. */
export function memberProfileFromClerk(user: User): MemberProfile {
	const emailName = user.primaryEmailAddress?.emailAddress.split("@")[0];

	return {
		id: user.id,
		displayName: user.fullName?.trim() || user.username || emailName || "Swiftie",
		username: user.username,
		avatarUrl: user.imageUrl || null,
	};
}

/**
 * Post HTML with anything executable removed. Quill's formatting (paragraphs,
 * marks, links, and lists, which Quill 2 writes as `<ol data-list="bullet">`)
 * survives: DOMPurify keeps `data-*` attributes by default.
 */
export function sanitisePostContent(html: string): string {
	return DOMPurify.sanitize(html, { FORBID_ATTR: ["style"] });
}

/** Publishes a Post as the given Member; throws InvalidPostError if there is nothing to publish. */
export async function publishPost(memberId: string, html: string): Promise<FeedPost> {
	const content = sanitisePostContent(html);
	const text = DOMPurify.sanitize(content, { RETURN_DOM: true }).textContent?.trim();

	if (!text) throw new InvalidPostError("A Post needs some text.");
	if (content.length > MAX_CONTENT_LENGTH) throw new InvalidPostError("This Post is too long.");

	const [{ id }] = await getDb().insert(posts).values({ memberId, content }).returning({ id: posts.id });
	const [row] = await selectFeedPosts().where(eq(posts.id, id));

	return toFeedPost(row);
}
