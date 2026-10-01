import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { type Database, getDb } from "@/db/client";
import { bare, type Narrowed, type NotNull, type RawValue, type RowOf } from "@/db/rows";
import { allowedAvatarUrl } from "@/lib/avatar";
import { displayNameOf } from "@/lib/display-name";
import { members, moderationDecisions, posts, reshares } from "@/db/schema";
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
	MODERATION_RETRY,
	NO_AUTHOR,
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

/*
  The raw queries name tables and columns through db/schema.ts, under these
  aliases (`${p.threadId}` is "p"."thread_id"), and type their rows from it
  (db/rows.ts), so renaming a column fails the typecheck here.
*/
/** The note a query is about. */
const p = alias(posts, "p");
/** Its author. */
const a = alias(members, "a");
/** A reply in its thread (child), counted or checked for. */
const c = alias(posts, "c");

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

// Each write the limit counts, as `made_at`.
const LIMIT_COUNTS: Record<LimitedWrite, (memberId: string, minutes: number) => ReturnType<typeof sql>> = {
	post: (memberId, minutes) => sql`
		select ${posts.createdAt} as made_at from ${posts}
		where ${posts.memberId} = ${memberId} and ${posts.parentId} is null and ${posts.createdAt} > now() - make_interval(mins => ${minutes})`,
	reply: (memberId, minutes) => sql`
		select ${posts.createdAt} as made_at from ${posts}
		where ${posts.memberId} = ${memberId} and ${posts.parentId} is not null and ${posts.createdAt} > now() - make_interval(mins => ${minutes})`,
	// Undone reshares still count: undo and redo cannot dodge the limit.
	reshare: (memberId, minutes) => sql`
		select ${reshares.createdAt} as made_at from ${reshares}
		where ${reshares.memberId} = ${memberId} and ${reshares.createdAt} > now() - make_interval(mins => ${minutes})`,
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
			ceil(extract(epoch from min(made_at) + make_interval(mins => ${minutes}) - now()))::int as wait
		from (${LIMIT_COUNTS[kind](memberId, minutes)} order by made_at desc limit ${count}) as recent
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

/** The note a reply answers. */
const parent = alias(posts, "parent");

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

		const rows = parentId
			? (
					await tx.execute<RowOf<typeof posts, "id">>(sql`
						insert into ${posts} (${bare(posts.memberId)}, ${bare(posts.content)}, ${bare(posts.parentId)}, ${bare(posts.rootId)})
						select ${memberId}, ${content}, ${parent.id}, ${parent.threadId}
						from ${posts} ${parent}
						where ${parent.id} = ${parentId} and ${parent.publishedAt} is not null and ${parent.deletedAt} is null
						returning ${posts.id}`)
				).rows
			: await tx.insert(posts).values({ memberId, content }).returning({ id: posts.id });

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
			await tx.insert(moderationDecisions).values({ postId: id, outcome: "unavailable", model, durationMs });

			return;
		}

		const approved = result.verdict === "allowed";
		const rows = await tx
			.update(posts)
			.set({ status: approved ? "approved" : "blocked", publishedAt: approved ? sql`now()` : null })
			.where(and(eq(posts.id, id), eq(posts.status, "pending"), isNull(posts.deletedAt)))
			.returning({ id: posts.id });

		// Torn up (or already judged) meanwhile: the verdict is kept as history only.
		await tx.insert(moderationDecisions).values({
			postId: id,
			outcome: approved ? "approved" : "blocked",
			category: result.verdict === "rejected" ? result.category : null,
			reason: rows[0] ? result.reason : null,
			model,
			durationMs,
		});
	});

	return outcomeOf(id);
}

/** The note's current state, as the Member who wrote it sees it. */
async function outcomeOf(id: string): Promise<WriteOutcome> {
	const [public_] = await selectPublicPosts(sql`${p.id} = ${id}`);

	if (public_) return { status: "approved", note: public_ };

	const [held] = await selectHeld(sql`${p.id} = ${id}`);

	if (!held) throw new PostNotFoundError();

	return held.status === "blocked" ? { status: "blocked", note: held, category: held.category ?? "insult" } : { status: "pending", note: held };
}

/**
 * "Check again": moderates one of the Member's own pending notes once more,
 * while it has had fewer than MAX_MODERATION_ATTEMPTS checks and has not been
 * given up on.
 */
export async function checkAgain(memberId: string, id: string, moderate: Moderate = moderatePost): Promise<WriteOutcome> {
	if (!isUuid(id)) throw new PostNotFoundError();

	const [held] = await selectHeld(sql`${p.id} = ${id} and ${p.memberId} = ${memberId}`);

	if (!held || held.status !== "pending") throw new PostNotFoundError();
	if (!held.canCheckAgain) throw new NoMoreChecksError();

	const [{ content }] = await getDb().select({ content: posts.content }).from(posts).where(eq(posts.id, id));

	return judge(id, content, moderate);
}

/**
 * When a pending note is due another scheduled check, from its own rows only
 * (its `created_at` and its last attempt in moderation_decisions), per
 * MODERATION_RETRY: at every hourly run during its first day, then daily, then
 * a last time once it is a week old. Each gap is ten minutes short, so a cron
 * run a few seconds early does not skip a turn.
 */
const dueForCheck = sql`(
	d.last_at is null
	or (${p.createdAt} > now() - make_interval(hours => ${MODERATION_RETRY.hourlyForHours}) and d.last_at < now() - interval '50 minutes')
	or (${p.createdAt} > now() - make_interval(days => ${MODERATION_RETRY.days}) and d.last_at < now() - interval '23 hours 50 minutes')
	or (${p.createdAt} <= now() - make_interval(days => ${MODERATION_RETRY.days}) and d.last_at < ${p.createdAt} + make_interval(days => ${MODERATION_RETRY.days}))
)`;

/** A pending note `p` whose last check (`lastAt`) came after its week was up: given up on. */
const givenUp = (lastAt = sql`d.last_at`) =>
	sql`(${p.status} = 'pending' and ${lastAt} >= ${p.createdAt} + make_interval(days => ${MODERATION_RETRY.days}))`;

/** Consecutive notes left without a verdict after which a run stops: the Gateway is down, the rest keep their turn. */
const STOP_AFTER_NO_VERDICTS = 3;

/**
 * The scheduled re-check (app/api/cron/moderation, hourly): moderates the
 * pending notes that are due (dueForCheck), least recently tried first, at
 * most `batch` at a time. `ids` limits it to those notes (tests). Returns
 * what it did, and the notes it gave up on in this run (their week is over
 * and the last check still had no verdict): each is reported once.
 */
export async function recheckPending({ batch = 20, moderate = moderatePost, ids }: { batch?: number; moderate?: Moderate; ids?: string[] } = {}) {
	const only = ids ? sql`and ${p.id} in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})` : sql``;
	const { rows } = await getDb().execute<RowOf<typeof posts, "id" | "content"> & { final: boolean }>(sql`
		select ${p.id}, ${p.content}, ${p.createdAt} <= now() - make_interval(days => ${MODERATION_RETRY.days}) as final
		from ${posts} ${p}
		join lateral (select max(${moderationDecisions.createdAt}) as last_at from ${moderationDecisions} where ${moderationDecisions.postId} = ${p.id}) d on true
		where ${p.status} = 'pending' and ${p.deletedAt} is null and ${dueForCheck} ${only}
		order by d.last_at nulls first, ${p.createdAt}
		limit ${batch}`);
	const outcomes: WriteOutcome["status"][] = [];
	let gaveUp = 0;
	let noVerdicts = 0;

	for (const { id, content, final } of rows) {
		const { status } = await judge(id, content, moderate);

		outcomes.push(status);
		if (status === "pending" && final) gaveUp++;
		noVerdicts = status === "pending" ? noVerdicts + 1 : 0;
		if (noVerdicts >= STOP_AFTER_NO_VERDICTS) break;
	}

	return {
		checked: outcomes.length,
		approved: outcomes.filter((status) => status === "approved").length,
		stillPending: outcomes.filter((status) => status === "pending").length,
		gaveUp,
	};
}

// ---------------------------------------------------------------------------
// Reading

/** A reshare of the note, counted. */
const s = alias(reshares, "s");

/** The author of a note (`a`), as postColumns and getThread select it. */
type AuthorRow = { author_id: RawValue<typeof members.id> } & RowOf<typeof members, "displayName" | "username" | "avatarUrl">;

type PostRow = RowOf<typeof posts, "id" | "content" | "isDemo" | "createdAt"> &
	NotNull<RowOf<typeof posts, "publishedAt">> &
	AuthorRow & { reply_count: number; reshare_count: number };

// Rows stored before avatars were checked may hold a picture next/image
// refuses (a Clerk avatar): those Members show their initials.
const authorOf = (row: AuthorRow): Author => ({
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

/** A public reply to `p`, as reply_count counts them (and listSitemapPosts checks for one). */
const publicReplyOfP = sql`${c.rootId} = ${p.id} and ${c.publishedAt} is not null and ${c.deletedAt} is null`;

const postColumns = sql`
	${p.id}, ${p.content}, ${p.isDemo}, ${p.createdAt}, ${p.publishedAt},
	${a.id} as author_id, ${a.displayName}, ${a.username}, ${a.avatarUrl},
	(select count(*)::int from ${posts} ${c} where ${publicReplyOfP}) as reply_count,
	(select count(*)::int from ${reshares} ${s} where ${s.postId} = ${p.id} and ${s.deletedAt} is null) as reshare_count`;

/** Public Posts (not replies) matching a condition on `p`. */
async function selectPublicPosts(where: ReturnType<typeof sql>): Promise<FeedPost[]> {
	const { rows } = await getDb().execute<PostRow>(sql`
		select ${postColumns}
		from ${posts} ${p} join ${members} ${a} on ${a.id} = ${p.memberId}
		where ${where} and ${p.publishedAt} is not null and ${p.deletedAt} is null`);

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

/** A reshare in the feed. */
const r = alias(reshares, "r");
/** The Member who reshared it. */
const rm = alias(members, "rm");

type FeedRow = PostRow &
	RowOf<typeof posts, "deletedAt"> & {
		kind: "post" | "reshare";
		/** The Post's id, or the reshare's. */
		item_id: RawValue<typeof posts.id> | RawValue<typeof reshares.id>;
		/** The item's time as Postgres prints it (microseconds): the exact cursor. */
		at_text: string;
		at: NonNullable<RawValue<typeof posts.publishedAt>> | RawValue<typeof reshares.createdAt>;
		// From the left join: null for a Post.
		resharer_id: RawValue<typeof members.id> | null;
		resharer_name: RawValue<typeof members.displayName> | null;
		resharer_username: RawValue<typeof members.username>;
		resharer_avatar: RawValue<typeof members.avatarUrl>;
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
			(select 'post'::text as kind, ${p.id} as item_id, ${p.publishedAt} as at, ${p.id} as post_id, null::text as resharer_id
				from ${posts} ${p}
				where ${p.parentId} is null and ${p.publishedAt} is not null and ${p.deletedAt} is null ${before(sql`${p.publishedAt}`, sql`${p.id}`)}
				order by ${p.publishedAt} desc, ${p.id} desc
				limit ${take})
			union all
			(select 'reshare'::text, ${r.id}, ${r.createdAt}, ${r.postId}, ${r.memberId}
				from ${reshares} ${r}
				where ${r.deletedAt} is null ${before(sql`${r.createdAt}`, sql`${r.id}`)}
				order by ${r.createdAt} desc, ${r.id} desc
				limit ${take})
		)
		select page.kind, page.item_id, page.at, page.at::text as at_text, ${p.deletedAt}, ${postColumns},
			${rm.id} as resharer_id, ${rm.displayName} as resharer_name, ${rm.username} as resharer_username, ${rm.avatarUrl} as resharer_avatar
		from page
		join ${posts} ${p} on ${p.id} = page.post_id
		join ${members} ${a} on ${a.id} = ${p.memberId}
		left join ${members} ${rm} on ${rm.id} = page.resharer_id
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

/** A thread's first Post needs this many visible characters to be indexed, unless someone replied. */
export const INDEXING_BAR_CHARACTERS = 140;

/**
 * Whether a thread is worth a search result: its first Post has at least
 * INDEXING_BAR_CHARACTERS visible characters, or at least one public reply.
 * A one-liner nobody answered would be a thin page. The same rule decides a
 * thread page's robots tag and its place in the sitemap.
 */
export function meetsIndexingBar(rootHtml: string, publicReplies: number): boolean {
	return publicReplies > 0 || characterCount(postPlainText(rootHtml).replace(/\s+/g, " ").trim()) >= INDEXING_BAR_CHARACTERS;
}

type ThreadRow = RowOf<typeof posts, "id" | "parentId" | "content" | "isDemo" | "isSeed" | "createdAt" | "deletedAt"> &
	NotNull<RowOf<typeof posts, "publishedAt">> &
	AuthorRow & { reshare_count: number };

/**
 * The thread a note belongs to: its first Post and every reply that is public
 * or torn up (kept, text and author erased, so the replies under it still
 * read), oldest first. Null when the note is not public (never was, or does not exist).
 */
export async function getThread(id: string): Promise<Thread | null> {
	if (!isUuid(id)) return null;

	const { rows } = await getDb().execute<ThreadRow>(sql`
		select ${p.id}, ${p.parentId}, ${p.content}, ${p.isDemo}, ${p.isSeed}, ${p.createdAt}, ${p.publishedAt}, ${p.deletedAt},
			${a.id} as author_id, ${a.displayName}, ${a.username}, ${a.avatarUrl},
			(select count(*)::int from ${reshares} ${s} where ${s.postId} = ${p.id} and ${s.deletedAt} is null) as reshare_count
		from ${posts} ${p} join ${members} ${a} on ${a.id} = ${p.memberId}
		where ${p.threadId} = (select ${posts.threadId} from ${posts} where ${posts.id} = ${id} and ${posts.publishedAt} is not null)
			and ${p.publishedAt} is not null
		order by ${p.createdAt}, ${p.id}`);
	const notes = rows.map(
		(row): ThreadNote & { reshareCount: number } => ({
			id: row.id,
			parentId: row.parent_id,
			author: row.deleted_at ? NO_AUTHOR : authorOf(row),
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
		indexable:
			!root.tornUp && !root.isDemo && !rows[rootIndex].is_seed && meetsIndexingBar(root.content, notes.filter((note) => note.parentId !== null && !note.tornUp).length),
	};
}

type HeldRow = RowOf<typeof posts, "id" | "content" | "rootId" | "parentId" | "createdAt"> &
	Narrowed<RowOf<typeof posts, "status">, Exclude<RawValue<typeof posts.status>, "approved">> &
	Narrowed<RowOf<typeof moderationDecisions, "category">, RefusalCategory | null> &
	RowOf<typeof moderationDecisions, "reason"> & { attempts: number; given_up: boolean };

/** The last refusal of a held note. */
const last = alias(moderationDecisions, "last");

async function selectHeld(where: ReturnType<typeof sql>): Promise<HeldNote[]> {
	const { rows } = await getDb().execute<HeldRow>(sql`
		select ${p.id}, ${p.content}, ${p.status}, ${p.rootId}, ${p.parentId}, ${p.createdAt}, d.attempts, coalesce(${givenUp()}, false) as given_up, ${last.category}, ${last.reason}
		from ${posts} ${p}
		join lateral (
			select count(*)::int as attempts, max(${moderationDecisions.createdAt}) as last_at from ${moderationDecisions} where ${moderationDecisions.postId} = ${p.id}
		) d on true
		left join lateral (
			select ${moderationDecisions.category}, ${moderationDecisions.reason} from ${moderationDecisions}
			where ${moderationDecisions.postId} = ${p.id} and ${moderationDecisions.outcome} = 'blocked' order by ${moderationDecisions.createdAt} desc limit 1
		) ${last} on true
		where ${where} and ${p.status} in ('pending', 'blocked') and ${p.deletedAt} is null
		order by ${p.createdAt} desc`);

	return rows.map((row) => ({
		id: row.id,
		content: sanitisePostHtml(row.content),
		status: row.status,
		category: row.status === "blocked" ? row.category : null,
		reason: row.status === "blocked" ? row.reason : null,
		attempts: row.attempts,
		canCheckAgain: row.status === "pending" && !row.given_up && row.attempts < MAX_MODERATION_ATTEMPTS,
		givenUp: row.given_up,
		createdAt: iso(row.created_at),
		rootId: row.root_id,
		parentId: row.parent_id,
	}));
}

/** The Member's own notes that are not public: waiting for a check, or refused. */
export const listHeld = (memberId: string) => selectHeld(sql`${p.memberId} = ${memberId}`);

/** The Posts the Member reshares now (most recent 500). */
export async function listOwnReshares(memberId: string): Promise<string[]> {
	const rows = await getDb()
		.select({ postId: reshares.postId })
		.from(reshares)
		.where(and(eq(reshares.memberId, memberId), isNull(reshares.deletedAt)))
		.orderBy(desc(reshares.createdAt))
		.limit(500);

	return rows.map((row) => row.postId);
}

/**
 * Public, real Posts for the sitemap: no replies, demo or seed content, and
 * only threads that meet the indexing bar (meetsIndexingBar), like their pages.
 */
export async function listSitemapPosts(limit = 5000): Promise<{ id: string; publishedAt: string }[]> {
	// A note's stored HTML is never shorter than its visible text: the length
	// check in SQL only skips notes that cannot meet the bar.
	const { rows } = await getDb().execute<RowOf<typeof posts, "id" | "content"> & NotNull<RowOf<typeof posts, "publishedAt">> & { reply_count: number }>(sql`
		select ${p.id}, ${p.publishedAt}, ${p.content},
			(select count(*)::int from ${posts} ${c} where ${publicReplyOfP}) as reply_count
		from ${posts} ${p}
		where ${p.parentId} is null and ${p.publishedAt} is not null and ${p.deletedAt} is null and not ${p.isDemo} and not ${p.isSeed}
			and (char_length(${p.content}) >= ${INDEXING_BAR_CHARACTERS}
				or exists (select 1 from ${posts} ${c} where ${publicReplyOfP}))
		order by ${p.publishedAt} desc limit ${limit}`);

	return rows
		.filter((row) => meetsIndexingBar(sanitisePostHtml(row.content), row.reply_count))
		.map((row) => ({ id: row.id, publishedAt: iso(row.published_at) }));
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

// ---------------------------------------------------------------------------
// A Member's own data: export and account deletion (GDPR arts. 15, 17, 20)

/** Everything Swiftter keeps about a Member, as their export gives it to them. */
export type MemberExport = {
	member: { id: string; displayName: string; username: string | null; avatarUrl: string | null; createdAt: string } | null;
	notes: {
		id: string;
		kind: "post" | "reply";
		parentId: string | null;
		rootId: string | null;
		/** Sanitised HTML; empty once torn up. */
		content: string;
		status: "pending" | "approved" | "blocked";
		createdAt: string;
		publishedAt: string | null;
		tornUpAt: string | null;
	}[];
	reshares: { postId: string; createdAt: string; undoneAt: string | null }[];
	moderationDecisions: { postId: string; outcome: string; category: string | null; reason: string | null; model: string; createdAt: string }[];
};

const isoOrNull = (value: Date | string | null) => (value === null ? null : iso(value));

/** The Member's row, notes (every state, torn up included), reshares (undone included) and every moderation decision on their notes. */
export async function exportMemberData(memberId: string): Promise<MemberExport> {
	const db = getDb();
	const [member, notes, reshares, decisions] = await Promise.all([
		db.execute<{ id: string; display_name: string; username: string | null; avatar_url: string | null; created_at: Date | string }>(sql`
			select id, display_name, username, avatar_url, created_at from members where id = ${memberId}`),
		db.execute<{
			id: string;
			parent_id: string | null;
			root_id: string | null;
			content: string;
			status: "pending" | "approved" | "blocked";
			created_at: Date | string;
			published_at: Date | string | null;
			deleted_at: Date | string | null;
		}>(sql`
			select id, parent_id, root_id, content, status, created_at, published_at, deleted_at
			from posts where member_id = ${memberId} order by created_at, id`),
		db.execute<{ post_id: string; created_at: Date | string; deleted_at: Date | string | null }>(sql`
			select post_id, created_at, deleted_at from reshares where member_id = ${memberId} order by created_at, id`),
		db.execute<{ post_id: string; outcome: string; category: string | null; reason: string | null; model: string; created_at: Date | string }>(sql`
			select d.post_id, d.outcome, d.category, d.reason, d.model, d.created_at
			from moderation_decisions d join posts p on p.id = d.post_id
			where p.member_id = ${memberId} order by d.created_at, d.id`),
	]);
	const row = member.rows[0];

	return {
		member: row ? { id: row.id, displayName: row.display_name, username: row.username, avatarUrl: row.avatar_url, createdAt: iso(row.created_at) } : null,
		notes: notes.rows.map((note) => ({
			id: note.id,
			kind: note.parent_id ? "reply" : "post",
			parentId: note.parent_id,
			rootId: note.root_id,
			content: note.deleted_at ? "" : sanitisePostHtml(note.content),
			status: note.status,
			createdAt: iso(note.created_at),
			publishedAt: isoOrNull(note.published_at),
			tornUpAt: isoOrNull(note.deleted_at),
		})),
		reshares: reshares.rows.map((entry) => ({ postId: entry.post_id, createdAt: iso(entry.created_at), undoneAt: isoOrNull(entry.deleted_at) })),
		moderationDecisions: decisions.rows.map((decision) => ({
			postId: decision.post_id,
			outcome: decision.outcome,
			category: decision.category,
			reason: decision.reason,
			model: decision.model,
			createdAt: iso(decision.created_at),
		})),
	};
}

/**
 * Deletes a Member's account, in one transaction, under their write lock:
 * - every note of theirs is torn up (text and moderation reasons erased), so
 *   the threads others replied in still read, with no name on them (NO_AUTHOR);
 * - their reshares are deleted;
 * - their Member row keeps only its id (other rows refer to it), no name or
 *   picture;
 * - their Neon Auth account goes, with its sessions and credentials (on
 *   delete cascade), straight from the `neon_auth` schema. Neon Auth's own
 *   delete-user endpoint is disabled on its hosted service (it answers 404),
 *   so this is the second deliberate exception to ADR-0004, after
 *   scripts/unseed.ts.
 * Tombstones nothing refers to are removed then, or by the daily purge.
 */
export async function deleteMemberAccount(memberId: string): Promise<void> {
	await getDb().transaction(async (tx) => {
		await lockMember(tx, memberId);
		await tx.execute(sql`update posts set content = '', deleted_at = coalesce(deleted_at, now()) where member_id = ${memberId}`);
		await tx.execute(sql`update moderation_decisions set reason = null where post_id in (select id from posts where member_id = ${memberId})`);
		await tx.execute(sql`delete from reshares where member_id = ${memberId}`);
		await tx.execute(sql`update members set display_name = '', username = null, avatar_url = null where id = ${memberId}`);
		await tx.execute(sql`delete from neon_auth."user" where id::text = ${memberId}`);
	});

	await purgeTombstones(memberId);
}

// ---------------------------------------------------------------------------
// Retention

/** How long Swiftter keeps what is not public, in days (docs/adr/0007). */
export const RETENTION_DAYS = 30;

/** Deepest chain of tombstones removed in one purge: a reply's tombstone goes first, then the one it answered. */
const MAX_TOMBSTONE_DEPTH = 50;

/**
 * The daily purge (app/api/cron/moderation), so nothing is kept longer than
 * it is needed:
 * - tombstones nothing refers to any more (undone reshares of a torn-up note
 *   go first: they can never be restored), once past the write limits' window;
 * - refused notes, and notes given up on, after RETENTION_DAYS (their author
 *   is told so in their margin), with their moderation history;
 * - the model's reasons on approved notes' decisions after RETENTION_DAYS
 *   (the outcome, category and model stay, for the audit).
 * Returns how many rows each step removed or cleared.
 */
export async function purgeExpired(db: Executor = getDb()) {
	const window = Math.max(LIMITS.post.minutes, LIMITS.reply.minutes);
	const unreferenced = sql`not exists (select 1 from posts c where c.parent_id = p.id) and not exists (select 1 from reshares r where r.post_id = p.id)`;

	const undoneReshares = await db.execute(sql`
		delete from reshares r using posts p
		where p.id = r.post_id and r.deleted_at is not null and p.deleted_at is not null`);
	let tombstones = 0;

	// One level of a thread at a time: a tombstone answered only by tombstones goes once they have.
	for (let depth = 0; depth < MAX_TOMBSTONE_DEPTH; depth++) {
		const { rowCount } = await db.execute(sql`
			delete from posts p
			where p.deleted_at is not null and p.created_at <= now() - make_interval(mins => ${window}) and ${unreferenced}`);

		if (!rowCount) break;
		tombstones += rowCount;
	}

	const held = await db.execute(sql`
		delete from posts p
		where p.deleted_at is null and p.created_at < now() - make_interval(days => ${RETENTION_DAYS})
			and (p.status = 'blocked' or ${givenUp(sql`(select max(created_at) from moderation_decisions where post_id = p.id)`)}) and ${unreferenced}`);
	const reasons = await db.execute(sql`
		update moderation_decisions set reason = null
		where outcome = 'approved' and reason is not null and created_at < now() - make_interval(days => ${RETENTION_DAYS})`);

	return { undoneReshares: undoneReshares.rowCount ?? 0, tombstones, heldNotes: held.rowCount ?? 0, reasons: reasons.rowCount ?? 0 };
}
