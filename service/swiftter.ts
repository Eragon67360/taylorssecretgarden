import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { type Database, getDb } from "@/db/client";
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
	/** `id` is the Member's, so the browser can offer them to delete their own Posts. */
	author: { id: string; displayName: string; username: string | null; avatarUrl: string | null };
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
	memberId: posts.memberId,
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
function toFeedPost({ memberId, displayName, username, avatarUrl, createdAt, content, ...post }: FeedRow): FeedPost {
	return {
		...post,
		content: sanitisePostHtml(content),
		createdAt: createdAt.toISOString(),
		author: { id: memberId, displayName, username, avatarUrl },
	};
}

/** The newest Posts first, each with its Member; deleted ones left out. */
export async function listFeed(): Promise<FeedPost[]> {
	const rows = await selectFeedPosts().where(isNull(posts.deletedAt)).orderBy(desc(posts.createdAt));

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

/** The Member has published POSTING_LIMIT.posts Posts within the window. */
export class PostingLimitError extends Error {
	constructor(
		/** Seconds until the next Post is allowed (at least 1). */
		readonly retryAfter: number,
	) {
		super("Posting limit reached");
	}
}

/**
 * Seconds until the Member may publish their next Post (when the oldest of
 * their last POSTING_LIMIT.posts Posts leaves the window), or null if they may
 * now. Counted in Postgres, on the database's clock, like `created_at`.
 */
export async function postingLimitWait(memberId: string, db: Pick<Database, "execute"> = getDb()): Promise<number | null> {
	const { rows } = await db.execute<{ count: number; wait: number | null }>(sql`
		select count(*)::int as count,
			ceil(extract(epoch from min(created_at) + make_interval(mins => ${POSTING_LIMIT.minutes}) - now()))::int as wait
		from (
			select ${posts.createdAt} as created_at from ${posts}
			where ${posts.memberId} = ${memberId} and ${posts.createdAt} > now() - make_interval(mins => ${POSTING_LIMIT.minutes})
			order by ${posts.createdAt} desc
			limit ${POSTING_LIMIT.posts}
		) as recent
	`);
	const [{ count, wait }] = rows;

	return count < POSTING_LIMIT.posts ? null : Math.max(1, wait ?? 1);
}

/**
 * The Post's content as it will be stored: sanitised HTML. Throws
 * InvalidPostError if it is too long or has no text left.
 */
export function preparePost(html: string): string {
	// Checked on the raw HTML, before any parsing.
	if (html.length > MAX_CONTENT_LENGTH) throw new InvalidPostError("This Post is too long.");

	const content = sanitisePostHtml(html);

	if (!postText(content)) throw new InvalidPostError("A Post needs some text.");

	return content;
}

/**
 * Publishes a Post as the given Member. Throws InvalidPostError if there is
 * nothing to publish, and PostingLimitError if the Member is at the limit:
 * checked again here, holding a per-Member lock until the Post is inserted, so
 * Posts sent all at once cannot slip past it.
 */
export async function publishPost(memberId: string, html: string): Promise<FeedPost> {
	const content = preparePost(html);

	const id = await getDb().transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(hashtext('swiftter-post:' || ${memberId}))`);

		const wait = await postingLimitWait(memberId, tx);

		if (wait !== null) throw new PostingLimitError(wait);
		const [inserted] = await tx.insert(posts).values({ memberId, content }).returning({ id: posts.id });

		return inserted.id;
	});
	const [row] = await selectFeedPosts().where(eq(posts.id, id));

	return toFeedPost(row);
}

/** No Post with this id that the Member may delete: not theirs, already deleted, or none at all. */
export class PostNotFoundError extends Error {
	constructor() {
		super("Post not found");
	}
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Deletes one of the Member's own Posts. Throws PostNotFoundError otherwise,
 * the same for someone else's Post as for a missing one.
 *
 * A Post still inside the posting limit's window keeps counting towards it,
 * or deleting would be a way round the limit (and round what moderation
 * costs): its content is erased and `deleted_at` set, and the row goes on a
 * later delete, once the window has passed. An older Post is removed at once.
 * Under the same per-Member lock as publishPost.
 */
export async function deletePost(memberId: string, postId: string): Promise<void> {
	if (!UUID.test(postId)) throw new PostNotFoundError();

	await getDb().transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(hashtext('swiftter-post:' || ${memberId}))`);

		const inWindow = sql`${posts.createdAt} > now() - make_interval(mins => ${POSTING_LIMIT.minutes})`;
		const own = and(eq(posts.id, postId), eq(posts.memberId, memberId), isNull(posts.deletedAt));
		const erased = await tx
			.update(posts)
			.set({ content: "", deletedAt: sql`now()` })
			.where(and(own, inWindow))
			.returning({ id: posts.id });
		const removed = erased.length ? erased : await tx.delete(posts).where(own).returning({ id: posts.id });

		if (!removed.length) throw new PostNotFoundError();

		// The Member's deleted Posts that no longer count towards the limit.
		await tx.delete(posts).where(and(eq(posts.memberId, memberId), sql`${posts.deletedAt} is not null`, sql`not (${inWindow})`));
	});
}
