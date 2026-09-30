import "server-only";

import { sql } from "drizzle-orm";

import { type Database, getDb } from "@/db/client";
import { allowedAvatarUrl } from "@/lib/avatar";
import { displayNameOf } from "@/lib/display-name";
import { members } from "@/db/schema";
import {
	type Author,
	characterCount,
	type FeedItem,
	type FeedPage,
	type FeedPost,
	type HeldNote,
	LIMITS,
	type LimitedWrite,
	MAX_MODERATION_ATTEMPTS,
	MAX_NOTE_CHARACTERS,
	type RefusalCategory,
	type Thread,
	type ThreadNote,
} from "@/lib/swiftter";
import { moderatePost, moderationModelName, type ModerationResult } from "@/service/moderation";
import { postModerationText, postPlainText, postText, sanitisePostHtml } from "@/service/post-html";

/**
 * Swiftter's data: the feed, threads, reshares and the moderation of every
 * note. All database access for Swiftter goes through this module.
 *
 * A note (a Post, or a reply) is stored `pending` first, then judged by AI
 * moderation, then approved (public, `published_at` set) or blocked (its
 * Member alone sees it). When moderation gives no verdict the note stays
 * pending, visible to its Member, and is checked again later (ADR-0007).
 */

export type { FeedItem, FeedPage, FeedPost } from "@/lib/swiftter";

/** What Swiftter keeps about a Member, copied from their Neon Auth user. */
export type MemberDetails = {
	id: string;
	displayName: string;
	username: string | null;
	avatarUrl: string | null;
};

/** Content that cannot be published: empty once sanitised, or too long. */
export class InvalidPostError extends Error {}

/** No such public note (or no such note of yours): the same answer either way, so nothing leaks. */
export class PostNotFoundError extends Error {
	constructor() {
		super("Post not found");
	}
}

/** A Member tried to reshare their own Post. */
export class SelfReshareError extends Error {}

/** The Member already reshares this Post. */
export class AlreadyResharedError extends Error {}

/** "Check again" was used up for this note. */
export class NoMoreChecksError extends Error {}

/** A feed cursor that does not decode. */
export class InvalidCursorError extends Error {}

/** The Member reached a write limit (LIMITS). */
export class PostingLimitError extends Error {
	constructor(
		readonly kind: LimitedWrite,
		/** Seconds until the next write of this kind is allowed (at least 1). */
		readonly retryAfter: number,
	) {
		super("Posting limit reached");
	}
}

/** The limit on Posts, as the posting-limit messages quote it. */
export const POSTING_LIMIT = { posts: LIMITS.post.count, minutes: LIMITS.post.minutes } as const;

/** Notes per feed page. */
export const PAGE_SIZE = 20;

/** Raw HTML longer than this is refused before any parsing. */
const MAX_HTML_LENGTH = 20_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

type Executor = Pick<Database, "execute">;

/** A timestamp from a raw query (node-postgres through Drizzle answers text: `2026-09-30 02:13:28.123456+00`) as ISO 8601. */
export function iso(value: Date | string): string {
	if (value instanceof Date) return value.toISOString();

	return new Date(value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00")).toISOString();
}

// ---------------------------------------------------------------------------
// Members

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
 * Member's handle is left empty. Neon Auth stores names and pictures as
 * given, so the name is cut to 80 graphemes (displayNameOf) and the picture
 * kept only when next/image may load it (lib/avatar.ts).
 */
export function memberFromAuthUser(user: AuthUser): MemberDetails {
	return {
		id: user.id,
		displayName: displayNameOf(user),
		username: null,
		avatarUrl: allowedAvatarUrl(user.image),
	};
}

// ---------------------------------------------------------------------------
// Content

/**
 * The note's content as it will be stored: sanitised HTML. Throws
 * InvalidPostError if it is too long or has no text left.
 */
export function preparePost(html: string): string {
	// Checked on the raw HTML, before any parsing.
	if (html.length > MAX_HTML_LENGTH) throw new InvalidPostError("This note is too long.");

	const content = sanitisePostHtml(html);

	if (!postText(content)) throw new InvalidPostError("A note needs some text.");

	const characters = characterCount(postPlainText(content).replace(/\n/g, ""));

	if (characters > MAX_NOTE_CHARACTERS) {
		throw new InvalidPostError(`This note is ${characters} characters long; ${MAX_NOTE_CHARACTERS} is the most a note can hold.`);
	}

	return content;
}

// ---------------------------------------------------------------------------
// Limits

const LIMIT_COUNTS: Record<LimitedWrite, (memberId: string, minutes: number) => ReturnType<typeof sql>> = {
	post: (memberId, minutes) => sql`
		select created_at from posts
		where member_id = ${memberId} and parent_id is null and created_at > now() - make_interval(mins => ${minutes})`,
	reply: (memberId, minutes) => sql`
		select created_at from posts
		where member_id = ${memberId} and parent_id is not null and created_at > now() - make_interval(mins => ${minutes})`,
	// Undone reshares still count: undo and redo cannot dodge the limit.
	reshare: (memberId, minutes) => sql`
		select created_at from reshares
		where member_id = ${memberId} and created_at > now() - make_interval(mins => ${minutes})`,
};

/**
 * Seconds until the Member may make their next write of this kind (when the
 * oldest of their last LIMITS[kind].count leaves the window), or null if they
 * may now. Counted in Postgres, on the database's clock, like `created_at`.
 * Torn-up notes still count.
 */
export async function limitWait(memberId: string, kind: LimitedWrite, db: Executor = getDb()): Promise<number | null> {
	const { count, minutes } = LIMITS[kind];
	const { rows } = await db.execute<{ count: number; wait: number | null }>(sql`
		select count(*)::int as count,
			ceil(extract(epoch from min(created_at) + make_interval(mins => ${minutes}) - now()))::int as wait
		from (${LIMIT_COUNTS[kind](memberId, minutes)} order by created_at desc limit ${count}) as recent
	`);
	const [{ count: made, wait }] = rows;

	return made < count ? null : Math.max(1, wait ?? 1);
}

/** Holds the Member's write lock until the transaction ends: their writes happen one at a time. */
const lockMember = (db: Executor, memberId: string) => db.execute(sql`select pg_advisory_xact_lock(hashtext('swiftter-post:' || ${memberId}))`);

async function checkLimit(db: Executor, memberId: string, kind: LimitedWrite) {
	const wait = await limitWait(memberId, kind, db);

	if (wait !== null) throw new PostingLimitError(kind, wait);
}

// ---------------------------------------------------------------------------
// Writing and moderating notes

/** What happened to a note just written or checked again. */
export type WriteOutcome =
	| { status: "approved"; note: FeedPost }
	| { status: "blocked"; note: HeldNote; category: RefusalCategory }
	| { status: "pending"; note: HeldNote };

/** The moderation step, replaceable in tests. */
export type Moderate = (text: string) => Promise<ModerationResult>;

/**
 * Writes a note as the given Member: a Post, or with `parentId` a reply to a
 * public note (PostNotFoundError otherwise). The note is stored pending first,
 * under the Member's lock and write limit, then moderated outside the
 * transaction, so a Gateway failure or a crash mid-check leaves a pending
 * note to check again, never a lost one.
 */
export async function writeNote(memberId: string, html: string, parentId?: string | null, moderate: Moderate = moderatePost): Promise<WriteOutcome> {
	const content = preparePost(html);

	if (parentId != null && !isUuid(parentId)) throw new PostNotFoundError();

	const id = await getDb().transaction(async (tx) => {
		await lockMember(tx, memberId);
		await checkLimit(tx, memberId, parentId ? "reply" : "post");

		const { rows } = parentId
			? await tx.execute<{ id: string }>(sql`
				insert into posts (member_id, content, parent_id, root_id)
				select ${memberId}, ${content}, parent.id, parent.thread_id
				from posts parent
				where parent.id = ${parentId} and parent.published_at is not null and parent.deleted_at is null
				returning id`)
			: await tx.execute<{ id: string }>(sql`insert into posts (member_id, content) values (${memberId}, ${content}) returning id`);

		if (!rows[0]) throw new PostNotFoundError();

		return rows[0].id;
	});

	return judge(id, content, moderate);
}

/**
 * Moderates a stored pending note and records the attempt. The note only
 * changes if it is still pending and not torn up, so a late verdict can never
 * bring back a note its Member deleted.
 */
async function judge(id: string, content: string, moderate: Moderate): Promise<WriteOutcome> {
	const started = Date.now();
	let result: ModerationResult | null = null;

	try {
		// The text with every link's destination spelled out, so a masked link is judged by where it leads.
		result = await moderate(postModerationText(content));
	} catch (error) {
		// Any failure means no verdict: the note stays pending, nothing is lost.
		// eslint-disable-next-line no-console
		console.error("Moderation gave no verdict", error instanceof Error ? error.message : error);
	}

	const durationMs = Date.now() - started;
	const model = moderationModelName();

	await getDb().transaction(async (tx) => {
		if (!result) {
			await tx.execute(sql`
				insert into moderation_decisions (post_id, outcome, model, duration_ms)
				values (${id}, 'unavailable', ${model}, ${durationMs})`);

			return;
		}

		const approved = result.verdict === "allowed";
		const { rows } = await tx.execute<{ id: string }>(sql`
			update posts set status = ${approved ? "approved" : "blocked"}, published_at = ${approved ? sql`now()` : sql`null`}
			where id = ${id} and status = 'pending' and deleted_at is null
			returning id`);

		// Torn up (or already judged) meanwhile: the verdict is kept as history only.
		await tx.execute(sql`
			insert into moderation_decisions (post_id, outcome, category, reason, model, duration_ms)
			values (${id}, ${approved ? "approved" : "blocked"}, ${result.verdict === "rejected" ? result.category : null},
				${rows[0] ? result.reason : null}, ${model}, ${durationMs})`);
	});

	return outcomeOf(id);
}

/** The note's current state, as the Member who wrote it sees it. */
async function outcomeOf(id: string): Promise<WriteOutcome> {
	const [public_] = await selectPublicPosts(sql`p.id = ${id}`);

	if (public_) return { status: "approved", note: public_ };

	const [held] = await selectHeld(sql`p.id = ${id}`);

	if (!held) throw new PostNotFoundError();

	return held.status === "blocked" ? { status: "blocked", note: held, category: held.category ?? "insult" } : { status: "pending", note: held };
}

/**
 * "Check again": moderates one of the Member's own pending notes once more,
 * at most MAX_MODERATION_ATTEMPTS times in all.
 */
export async function checkAgain(memberId: string, id: string, moderate: Moderate = moderatePost): Promise<WriteOutcome> {
	if (!isUuid(id)) throw new PostNotFoundError();

	const [held] = await selectHeld(sql`p.id = ${id} and p.member_id = ${memberId}`);

	if (!held || held.status !== "pending") throw new PostNotFoundError();
	if (!held.canCheckAgain) throw new NoMoreChecksError();

	const { rows } = await getDb().execute<{ content: string }>(sql`select content from posts where id = ${id}`);

	return judge(id, rows[0].content, moderate);
}

/**
 * The scheduled re-check (app/api/cron/moderation): moderates pending notes
 * whose last attempt is old enough (5, 10, then 20 minutes: backing off), at
 * most `batch` at a time and never past MAX_MODERATION_ATTEMPTS. Returns what
 * it did, and how many notes have waited longer than an hour.
 */
export async function recheckPending(batch = 10, moderate: Moderate = moderatePost) {
	const { rows } = await getDb().execute<{ id: string; content: string }>(sql`
		select p.id, p.content
		from posts p
		join lateral (
			select count(*)::int as attempts, max(created_at) as last_at from moderation_decisions d where d.post_id = p.id
		) d on true
		where p.status = 'pending' and p.deleted_at is null
			and d.attempts < ${MAX_MODERATION_ATTEMPTS}
			and (d.last_at is null or d.last_at < now() - make_interval(mins => 5 * power(2, greatest(d.attempts - 1, 0))::int))
		order by p.created_at
		limit ${batch}`);
	const outcomes: WriteOutcome["status"][] = [];

	for (const { id, content } of rows) outcomes.push((await judge(id, content, moderate)).status);

	const { rows: stale } = await getDb().execute<{ count: number }>(sql`
		select count(*)::int as count from posts where status = 'pending' and deleted_at is null and created_at < now() - interval '1 hour'`);

	return { checked: outcomes.length, approved: outcomes.filter((status) => status === "approved").length, stillPendingOverAnHour: stale[0].count };
}

// ---------------------------------------------------------------------------
// Reading

type PostRow = {
	id: string;
	content: string;
	is_demo: boolean;
	created_at: Date | string;
	published_at: Date | string;
	author_id: string;
	display_name: string;
	username: string | null;
	avatar_url: string | null;
	reply_count: number;
	reshare_count: number;
};

// Rows stored before avatars were checked may hold a picture next/image
// refuses (a Clerk avatar): those Members show their initials.
const authorOf = (row: { author_id: string; display_name: string; username: string | null; avatar_url: string | null }): Author => ({
	id: row.author_id,
	displayName: row.display_name,
	username: row.username,
	avatarUrl: allowedAvatarUrl(row.avatar_url),
});

// Every note leaves the server sanitised, including rows written some other
// way than writeNote, so the browser renders its HTML as is (and never
// downloads the sanitiser).
const toFeedPost = (row: PostRow): FeedPost => ({
	id: row.id,
	content: sanitisePostHtml(row.content),
	isDemo: row.is_demo,
	createdAt: iso(row.created_at),
	publishedAt: iso(row.published_at),
	author: authorOf(row),
	replyCount: row.reply_count,
	reshareCount: row.reshare_count,
});

const postColumns = sql`
	p.id, p.content, p.is_demo, p.created_at, p.published_at,
	a.id as author_id, a.display_name, a.username, a.avatar_url,
	(select count(*)::int from posts c where c.root_id = p.id and c.published_at is not null and c.deleted_at is null) as reply_count,
	(select count(*)::int from reshares s where s.post_id = p.id and s.deleted_at is null) as reshare_count`;

/** Public Posts (not replies) matching a condition on `p`. */
async function selectPublicPosts(where: ReturnType<typeof sql>): Promise<FeedPost[]> {
	const { rows } = await getDb().execute<PostRow>(sql`
		select ${postColumns}
		from posts p join members a on a.id = p.member_id
		where ${where} and p.published_at is not null and p.deleted_at is null`);

	return rows.map(toFeedPost);
}

/** A timestamptz as Postgres prints it: `2026-09-30 02:13:28.123456+00`. */
const POSTGRES_TIMESTAMP = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}(:?\d{2})?|Z)$/;

const encodeCursor = (at: string, id: string) => Buffer.from(JSON.stringify([at, id])).toString("base64url");

function decodeCursor(cursor: string): { at: string; id: string } {
	try {
		const [at, id] = JSON.parse(Buffer.from(cursor, "base64url").toString()) as unknown[];

		if (typeof at === "string" && POSTGRES_TIMESTAMP.test(at) && isUuid(id)) return { at, id };
	} catch {
		// Falls through to the error below.
	}
	throw new InvalidCursorError("Invalid cursor");
}

type FeedRow = PostRow & {
	kind: "post" | "reshare";
	item_id: string;
	/** The item's time as Postgres prints it (microseconds): the exact cursor. */
	at_text: string;
	at: Date | string;
	deleted_at: Date | string | null;
	resharer_id: string | null;
	resharer_name: string | null;
	resharer_username: string | null;
	resharer_avatar: string | null;
};

/**
 * One page of the feed: public Posts and reshares (a reshare of a Post since
 * torn up shows it as torn up), newest first. Keyset pagination on (time, id),
 * so the order is total and stable: new notes arriving never shift a page,
 * and no entry is shown twice or skipped. One SQL query per page, whatever
 * its size (counts are sub-selects, authors joins).
 */
export async function listFeed(cursor?: string | null, pageSize = PAGE_SIZE, db: Executor = getDb()): Promise<FeedPage> {
	const after = cursor ? decodeCursor(cursor) : null;
	const before = (at: ReturnType<typeof sql>, id: ReturnType<typeof sql>) =>
		after ? sql`and (${at}, ${id}) < (${after.at}::timestamptz, ${after.id}::uuid)` : sql``;
	const take = pageSize + 1;

	const { rows } = await db.execute<FeedRow>(sql`
		with page as (
			(select 'post'::text as kind, p.id as item_id, p.published_at as at, p.id as post_id, null::text as resharer_id
				from posts p
				where p.parent_id is null and p.published_at is not null and p.deleted_at is null ${before(sql`p.published_at`, sql`p.id`)}
				order by p.published_at desc, p.id desc
				limit ${take})
			union all
			(select 'reshare'::text, r.id, r.created_at, r.post_id, r.member_id
				from reshares r
				where r.deleted_at is null ${before(sql`r.created_at`, sql`r.id`)}
				order by r.created_at desc, r.id desc
				limit ${take})
		)
		select page.kind, page.item_id, page.at, page.at::text as at_text, p.deleted_at, ${postColumns},
			rm.id as resharer_id, rm.display_name as resharer_name, rm.username as resharer_username, rm.avatar_url as resharer_avatar
		from page
		join posts p on p.id = page.post_id
		join members a on a.id = p.member_id
		left join members rm on rm.id = page.resharer_id
		order by page.at desc, page.item_id desc
		limit ${take}`);

	const items = rows.slice(0, pageSize).map((row): FeedItem => {
		if (row.kind === "post") return { kind: "post", key: row.item_id, post: toFeedPost(row) };

		return {
			kind: "reshare",
			key: row.item_id,
			resharedAt: iso(row.at),
			resharedBy: authorOf({ author_id: row.resharer_id!, display_name: row.resharer_name!, username: row.resharer_username, avatar_url: row.resharer_avatar }),
			post: row.deleted_at ? { id: row.id, tornUp: true } : toFeedPost(row),
		};
	});
	const last = rows[pageSize - 1];

	return { items, nextCursor: rows.length > pageSize && last ? encodeCursor(last.at_text, last.item_id) : null };
}

type ThreadRow = {
	id: string;
	parent_id: string | null;
	content: string;
	is_demo: boolean;
	created_at: Date | string;
	published_at: Date | string;
	deleted_at: Date | string | null;
	author_id: string;
	display_name: string;
	username: string | null;
	avatar_url: string | null;
};

/**
 * The thread a note belongs to: its first Post and every reply that is public
 * or torn up (kept, text erased, so the replies under it still read), oldest
 * first. Null when the note is not public (never was, or does not exist).
 */
export async function getThread(id: string): Promise<Thread | null> {
	if (!isUuid(id)) return null;

	const { rows } = await getDb().execute<ThreadRow & { reshare_count: number; is_seed: boolean }>(sql`
		select p.id, p.parent_id, p.content, p.is_demo, p.is_seed, p.created_at, p.published_at, p.deleted_at,
			a.id as author_id, a.display_name, a.username, a.avatar_url,
			(select count(*)::int from reshares s where s.post_id = p.id and s.deleted_at is null) as reshare_count
		from posts p join members a on a.id = p.member_id
		where p.thread_id = (select thread_id from posts where id = ${id} and published_at is not null)
			and p.published_at is not null
		order by p.created_at, p.id`);
	const notes = rows.map(
		(row): ThreadNote & { reshareCount: number } => ({
			id: row.id,
			parentId: row.parent_id,
			author: authorOf(row),
			content: row.deleted_at ? "" : sanitisePostHtml(row.content),
			tornUp: !!row.deleted_at,
			isDemo: row.is_demo,
			createdAt: iso(row.created_at),
			publishedAt: iso(row.published_at),
			reshareCount: row.reshare_count,
		}),
	);
	const rootIndex = notes.findIndex((note) => note.parentId === null);

	if (rootIndex < 0) return null;

	const { reshareCount, ...root } = notes[rootIndex];

	return {
		root,
		replies: notes.filter((note) => note.parentId !== null).map(({ reshareCount: _count, ...note }) => note),
		reshareCount,
		indexable: !root.tornUp && !root.isDemo && !rows[rootIndex].is_seed,
	};
}

type HeldRow = {
	id: string;
	content: string;
	status: "pending" | "blocked";
	root_id: string | null;
	created_at: Date | string;
	attempts: number;
	category: RefusalCategory | null;
	reason: string | null;
};

async function selectHeld(where: ReturnType<typeof sql>): Promise<HeldNote[]> {
	const { rows } = await getDb().execute<HeldRow>(sql`
		select p.id, p.content, p.status, p.root_id, p.created_at, d.attempts, last.category, last.reason
		from posts p
		join lateral (select count(*)::int as attempts from moderation_decisions where post_id = p.id) d on true
		left join lateral (
			select category, reason from moderation_decisions where post_id = p.id and outcome = 'blocked' order by created_at desc limit 1
		) last on true
		where ${where} and p.status in ('pending', 'blocked') and p.deleted_at is null
		order by p.created_at desc`);

	return rows.map((row) => ({
		id: row.id,
		content: sanitisePostHtml(row.content),
		status: row.status,
		category: row.status === "blocked" ? row.category : null,
		reason: row.status === "blocked" ? row.reason : null,
		attempts: row.attempts,
		canCheckAgain: row.status === "pending" && row.attempts < MAX_MODERATION_ATTEMPTS,
		createdAt: iso(row.created_at),
		rootId: row.root_id,
	}));
}

/** The Member's own notes that are not public: waiting for a check, or refused. */
export const listHeld = (memberId: string) => selectHeld(sql`p.member_id = ${memberId}`);

/** The Posts the Member reshares now (most recent 500). */
export async function listOwnReshares(memberId: string): Promise<string[]> {
	const { rows } = await getDb().execute<{ post_id: string }>(sql`
		select post_id from reshares where member_id = ${memberId} and deleted_at is null order by created_at desc limit 500`);

	return rows.map((row) => row.post_id);
}

/** Public, real Posts for the sitemap: no replies, demo or seed content. */
export async function listSitemapPosts(limit = 5000): Promise<{ id: string; publishedAt: string }[]> {
	const { rows } = await getDb().execute<{ id: string; published_at: Date | string }>(sql`
		select id, published_at from posts
		where parent_id is null and published_at is not null and deleted_at is null and not is_demo and not is_seed
		order by published_at desc limit ${limit}`);

	return rows.map((row) => ({ id: row.id, publishedAt: iso(row.published_at) }));
}

// ---------------------------------------------------------------------------
// Reshares

/**
 * Reshares someone else's public Post (not a reply). Resharing again after
 * undoing restores the same entry. Throws PostNotFoundError,
 * SelfReshareError, AlreadyResharedError or PostingLimitError.
 */
export async function reshare(memberId: string, postId: string): Promise<void> {
	if (!isUuid(postId)) throw new PostNotFoundError();

	await getDb().transaction(async (tx) => {
		await lockMember(tx, memberId);

		const { rows: targets } = await tx.execute<{ member_id: string }>(sql`
			select member_id from posts where id = ${postId} and parent_id is null and published_at is not null and deleted_at is null`);

		if (!targets[0]) throw new PostNotFoundError();
		if (targets[0].member_id === memberId) throw new SelfReshareError("You can't reshare your own note.");

		const { rows: existing } = await tx.execute<{ deleted_at: Date | string | null }>(sql`
			select deleted_at from reshares where member_id = ${memberId} and post_id = ${postId}`);

		if (existing[0] && !existing[0].deleted_at) throw new AlreadyResharedError("You already reshare this note.");
		if (existing[0]) {
			await tx.execute(sql`update reshares set deleted_at = null where member_id = ${memberId} and post_id = ${postId}`);

			return;
		}

		await checkLimit(tx, memberId, "reshare");
		await tx.execute(sql`insert into reshares (member_id, post_id) values (${memberId}, ${postId})`);
	});
}

/** Undoes the Member's reshare of a Post. Throws PostNotFoundError when they do not reshare it. */
export async function unreshare(memberId: string, postId: string): Promise<void> {
	if (!isUuid(postId)) throw new PostNotFoundError();

	const { rows } = await getDb().execute(sql`
		update reshares set deleted_at = now() where member_id = ${memberId} and post_id = ${postId} and deleted_at is null returning id`);

	if (!rows[0]) throw new PostNotFoundError();
}

// ---------------------------------------------------------------------------
// Tearing up

/**
 * Tears up one of the Member's own notes (Post or reply, public or held).
 * Throws PostNotFoundError otherwise, the same for someone else's note as for
 * a missing one. Always a tombstone first: the text and moderation reasons
 * are erased at once, the row stays while replies or reshares refer to it
 * (they show it as torn up) and while it still counts towards the write
 * limits; the Member's tombstones past that are then removed.
 */
export async function deletePost(memberId: string, postId: string): Promise<void> {
	if (!isUuid(postId)) throw new PostNotFoundError();

	await getDb().transaction(async (tx) => {
		const { rows } = await tx.execute(sql`
			update posts set content = '', deleted_at = now()
			where id = ${postId} and member_id = ${memberId} and deleted_at is null
			returning id`);

		if (!rows[0]) throw new PostNotFoundError();
		await tx.execute(sql`update moderation_decisions set reason = null where post_id = ${postId}`);
	});

	await purgeTombstones(memberId);
}

/**
 * Removes the Member's tombstones that nothing refers to and that no longer
 * count towards a limit. Best effort: a reply arriving at the same moment
 * makes Postgres refuse the delete (foreign key), and the row simply stays.
 */
async function purgeTombstones(memberId: string) {
	const window = Math.max(LIMITS.post.minutes, LIMITS.reply.minutes);

	try {
		await getDb().execute(sql`
			delete from posts p
			where p.member_id = ${memberId} and p.deleted_at is not null
				and p.created_at <= now() - make_interval(mins => ${window})
				and not exists (select 1 from posts c where c.parent_id = p.id)
				and not exists (select 1 from reshares r where r.post_id = p.id)`);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.warn("Tombstone purge skipped", error instanceof Error ? error.message : error);
	}
}
