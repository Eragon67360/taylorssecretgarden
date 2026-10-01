import "server-only";

import { sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db/client";
import { type NotNull, type RawValue, type RowOf } from "@/db/rows";
import { members, posts, reshares } from "@/db/schema";
import { allowedAvatarUrl } from "@/lib/avatar";
import { type Author, type FeedPage, type FeedPost } from "@/lib/swiftter";
import { postPlainText, sanitisePostHtml } from "@/service/post-html";
import { InvalidCursorError, iso, isUuid, PAGE_SIZE } from "@/service/swiftter";

/*
  Swiftter seen by Member: a Member's page (/swiftter/m/[id]) with their
  public Posts, their own list of what they published (the guestbook page),
  and how many replies their notes received since they last looked (the
  header's badge). Read-only; kept apart from service/swiftter.ts so the two
  can change without stepping on each other.

  Only public notes are ever read here (`published_at` set, not torn up): a
  held or refused note never reaches a Member's page, nor anyone else.
*/

/*
  Typed like service/swiftter.ts: tables and columns named through
  db/schema.ts under these aliases, rows typed from it (db/rows.ts).
*/
/** A note (`p`), a public reply under it (`c`), its Member (`a`), a reshare of it (`s`). */
const p = alias(posts, "p");
const c = alias(posts, "c");
const a = alias(members, "a");
const s = alias(reshares, "s");

/** Neon Auth ids are UUIDs, the demo Members' `demo_juniper`: anything else is no Member. */
const MEMBER_ID = /^[\w-]{1,64}$/;

export const isMemberId = (value: unknown): value is string => typeof value === "string" && MEMBER_ID.test(value);

/** `p` is public: approved, published, not torn up. */
const publicP = sql`${p.publishedAt} is not null and ${p.deletedAt} is null`;

/**
 * A Member with a page: they exist and still have a name. Deleting an
 * account empties the name (deleteMemberAccount), and the page goes with it.
 */
const listedA = sql`${a.displayName} <> ''`;

/** A Member's page: who they are and how much they published. No email: Swiftter never stores one. */
export type MemberProfile = Author & { isDemo: boolean; noteCount: number; replyCount: number };

/** The Member's page, or null: no such Member, or their account was deleted. */
export async function getMemberProfile(id: string): Promise<MemberProfile | null> {
  if (!isMemberId(id)) return null;

  const { rows } = await getDb().execute<
    RowOf<typeof members, "id" | "displayName" | "username" | "avatarUrl" | "isDemo"> & { note_count: number; reply_count: number }
  >(sql`
		select ${a.id}, ${a.displayName}, ${a.username}, ${a.avatarUrl}, ${a.isDemo},
			(select count(*)::int from ${posts} ${p} where ${p.memberId} = ${a.id} and ${p.parentId} is null and ${publicP}) as note_count,
			(select count(*)::int from ${posts} ${p} where ${p.memberId} = ${a.id} and ${p.parentId} is not null and ${publicP}) as reply_count
		from ${members} ${a}
		where ${a.id} = ${id} and ${listedA}`);
  const [row] = rows;

  if (!row) return null;

  return {
    id: row.id,
    displayName: row.display_name,
    username: row.username,
    avatarUrl: allowedAvatarUrl(row.avatar_url),
    isDemo: row.is_demo,
    noteCount: row.note_count,
    replyCount: row.reply_count,
  };
}

// A cursor like the feed's (service/swiftter.ts): the last Post's exact time and id.
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

/**
 * One page of a Member's public Posts (not replies), newest published first,
 * keyset-paginated on (published_at, id) like the feed, in one query. Empty
 * for a Member without a page (getMemberProfile).
 */
export async function listMemberPosts(memberId: string, cursor?: string | null, pageSize = PAGE_SIZE): Promise<FeedPage> {
  if (!isMemberId(memberId)) return { items: [], nextCursor: null };

  const after = cursor ? decodeCursor(cursor) : null;
  const { rows } = await getDb().execute<
    RowOf<typeof posts, "id" | "content" | "isDemo" | "createdAt"> &
      NotNull<RowOf<typeof posts, "publishedAt">> & { author_id: RawValue<typeof members.id> } & RowOf<
        typeof members,
        "displayName" | "username" | "avatarUrl"
      > & {
        /** Its time as Postgres prints it (microseconds): the exact cursor. */
        at_text: string;
        reply_count: number;
        reshare_count: number;
      }
  >(sql`
		select ${p.id}, ${p.content}, ${p.isDemo}, ${p.createdAt}, ${p.publishedAt}, ${p.publishedAt}::text as at_text,
			${a.id} as author_id, ${a.displayName}, ${a.username}, ${a.avatarUrl},
			(select count(*)::int from ${posts} ${c} where ${c.rootId} = ${p.id} and ${c.publishedAt} is not null and ${c.deletedAt} is null) as reply_count,
			(select count(*)::int from ${reshares} ${s} where ${s.postId} = ${p.id} and ${s.deletedAt} is null) as reshare_count
		from ${posts} ${p} join ${members} ${a} on ${a.id} = ${p.memberId}
		where ${p.memberId} = ${memberId} and ${listedA} and ${p.parentId} is null and ${publicP}
			${after ? sql`and (${p.publishedAt}, ${p.id}) < (${after.at}::timestamptz, ${after.id}::uuid)` : sql``}
		order by ${p.publishedAt} desc, ${p.id} desc
		limit ${pageSize + 1}`);

  const items = rows.slice(0, pageSize).map((row) => {
    const post: FeedPost = {
      id: row.id,
      content: sanitisePostHtml(row.content),
      isDemo: row.is_demo,
      createdAt: iso(row.created_at),
      publishedAt: iso(row.published_at),
      author: { id: row.author_id, displayName: row.display_name, username: row.username, avatarUrl: allowedAvatarUrl(row.avatar_url) },
      replyCount: row.reply_count,
      reshareCount: row.reshare_count,
    };

    return { kind: "post" as const, key: post.id, post };
  });
  const last = rows[pageSize - 1];

  return { items, nextCursor: rows.length > pageSize && last ? encodeCursor(last.at_text, last.id) : null };
}

/** One of the signed-in Member's public notes, as their guestbook page lists it. */
export type OwnNote = {
  id: string;
  /** A reply (its link opens its thread on it), or a Post. */
  isReply: boolean;
  /** Its text, plain, cut for a list. */
  excerpt: string;
  publishedAt: string;
  /** Public replies in its thread (a Post), or under it (a reply). */
  replyCount: number;
};

/** How much of a note the guestbook page's list shows. */
const EXCERPT_LENGTH = 140;

/** At most this many in the list; the export has them all. */
export const OWN_NOTES_LIMIT = 100;

/**
 * The Member's own public notes and replies, newest first (at most
 * OWN_NOTES_LIMIT), and how many there are in all. Held and torn-up notes are
 * not in it: the feed's margin shows the held ones, the export everything.
 */
export async function listOwnNotes(memberId: string): Promise<{ notes: OwnNote[]; total: number }> {
  const { rows } = await getDb().execute<
    RowOf<typeof posts, "id" | "parentId" | "content"> & NotNull<RowOf<typeof posts, "publishedAt">> & { reply_count: number; total: number }
  >(sql`
		select ${p.id}, ${p.parentId}, ${p.content}, ${p.publishedAt},
			(select count(*)::int from ${posts} ${c}
				where (case when ${p.parentId} is null then ${c.rootId} = ${p.id} else ${c.parentId} = ${p.id} end)
					and ${c.publishedAt} is not null and ${c.deletedAt} is null) as reply_count,
			count(*) over ()::int as total
		from ${posts} ${p}
		where ${p.memberId} = ${memberId} and ${publicP}
		order by ${p.publishedAt} desc, ${p.id} desc
		limit ${OWN_NOTES_LIMIT}`);

  return {
    notes: rows.map((row) => {
      const text = postPlainText(sanitisePostHtml(row.content)).replace(/\s+/g, " ").trim();

      return {
        id: row.id,
        isReply: row.parent_id !== null,
        excerpt: text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…` : text,
        publishedAt: iso(row.published_at),
        replyCount: row.reply_count,
      };
    }),
    total: rows[0]?.total ?? 0,
  };
}

/** The badge never counts past this: "99+" says enough. */
export const NEW_REPLIES_CAP = 100;

/**
 * How many public replies other Members wrote to the Member's notes (straight
 * under one of their public notes) since `since`, by when they were
 * published, up to NEW_REPLIES_CAP; and the database's time now, for the
 * browser to send as the next `since`. Without `since` the count is 0: the
 * Member starts looking from now. Times are the database's alone, so a
 * browser's clock running fast or slow cannot hide a reply or count one twice.
 */
export async function countNewReplies(memberId: string, since: Date | null): Promise<{ count: number; at: string }> {
  const { rows } = await getDb().execute<{ count: number; at: NonNullable<RawValue<typeof posts.publishedAt>> }>(sql`
		select (
			${
        since
          ? sql`select count(*)::int from (
						select 1 from ${posts} ${c} join ${posts} ${p} on ${p.id} = ${c.parentId}
						where ${p.memberId} = ${memberId} and ${publicP}
							and ${c.memberId} <> ${memberId} and ${c.publishedAt} is not null and ${c.deletedAt} is null
							and ${c.publishedAt} > ${since.toISOString()}::timestamptz
						limit ${NEW_REPLIES_CAP}) as recent`
          : sql`select 0`
      }
		) as count, now() as at`);

  return { count: rows[0].count, at: iso(rows[0].at) };
}
