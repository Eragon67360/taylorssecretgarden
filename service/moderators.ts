import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db/client";
import { type RawValue, type RowOf } from "@/db/rows";
import { members, moderationDecisions, moderators, noteReports, posts } from "@/db/schema";
import { HUMAN_MODEL, type ModerationAction, type ModerationItem, type NoteReportKind } from "@/lib/swiftter";
import { sanitisePostHtml } from "@/service/post-html";
import { iso, isUuid, PostNotFoundError, prepareReason, purgeTombstones, tearUpInTransaction } from "@/service/swiftter";

/*
  The moderation page's data (/guestbook/moderation, #166): who is a
  moderator, the notes Members asked a human about (open reports and
  appeals), and what a moderator decides about each. Every function checks
  the role itself, in the database, whatever the route already checked.

  A decision is recorded like the model's, in moderation_decisions, with
  `human:<moderator's member id>` as its model and the moderator's optional
  note as its reason, and settles the note's open reports and appeals.
*/

/** Someone who is not (or no longer) a moderator tried to act as one. */
export class NotModeratorError extends Error {
  constructor() {
    super("Not a moderator");
  }
}

/** Nothing about this note is waiting for a human any more: another moderator, or its author, got there first. */
export class AlreadyHandledError extends Error {}

/** "Publish after all" on a note moderation did not refuse. */
export class NotRefusedError extends Error {}

/** Whether the Member may use the moderation page. */
export async function isModerator(memberId: string): Promise<boolean> {
  const rows = await getDb().select({ memberId: moderators.memberId }).from(moderators).where(eq(moderators.memberId, memberId));

  return rows.length > 0;
}

async function assertModerator(memberId: string) {
  if (!(await isModerator(memberId))) throw new NotModeratorError();
}

/*
  Typed like service/swiftter.ts: tables and columns named through
  db/schema.ts under these aliases, rows typed from it (db/rows.ts).
*/
/** The note asked about (`p`), its author (`a`), its thread's first Post (`root`), a report or appeal of it (`r`), the model's last decision (`d`). */
const p = alias(posts, "p");
const a = alias(members, "a");
const root = alias(posts, "root");
const r = alias(noteReports, "r");
const d = alias(moderationDecisions, "d");

type QueueRow = RowOf<typeof posts, "id" | "content" | "status" | "parentId" | "rootId" | "createdAt" | "publishedAt"> & {
  author_id: RawValue<typeof members.id>;
  display_name: RawValue<typeof members.displayName>;
  root_public: boolean | null;
  reports: { kind: NoteReportKind; reason: string | null; created_at: string }[];
  ai_outcome: RawValue<typeof moderationDecisions.outcome> | null;
  ai_category: RawValue<typeof moderationDecisions.category>;
  ai_reason: RawValue<typeof moderationDecisions.reason>;
  ai_at: RawValue<typeof moderationDecisions.createdAt> | null;
  total: number;
};

/** Notes the moderation page shows at once; the page says how many are waiting in all. */
export const QUEUE_SIZE = 100;

/**
 * What waits for a moderator: every note with an open report or appeal (not
 * torn up: tearing up settles them), the most recently asked about first,
 * with its text (a held note's too), its author, the open reports' reasons
 * and dates (not who sent them) and the model's last decision. At most
 * `limit` notes, and how many there are in all. Throws NotModeratorError.
 */
export async function listModerationQueue(moderatorId: string, limit = QUEUE_SIZE): Promise<{ items: ModerationItem[]; total: number }> {
  await assertModerator(moderatorId);

  const { rows } = await getDb().execute<QueueRow>(sql`
		with open as (
			select ${noteReports.postId} as post_id, max(${noteReports.createdAt}) as latest from ${noteReports}
			where ${noteReports.resolvedAt} is null group by ${noteReports.postId}
		)
		select ${p.id}, ${p.content}, ${p.status}, ${p.parentId}, ${p.rootId}, ${p.createdAt}, ${p.publishedAt},
			${a.id} as author_id, ${a.displayName},
			(select ${root.publishedAt} is not null from ${posts} ${root} where ${root.id} = ${p.rootId}) as root_public,
			(select json_agg(json_build_object('kind', ${r.kind}, 'reason', ${r.reason}, 'created_at', ${r.createdAt}) order by ${r.createdAt} desc)
				from ${noteReports} ${r} where ${r.postId} = ${p.id} and ${r.resolvedAt} is null) as reports,
			${d.outcome} as ai_outcome, ${d.category} as ai_category, ${d.reason} as ai_reason, ${d.createdAt} as ai_at,
			(count(*) over ())::int as total
		from open
		join ${posts} ${p} on ${p.id} = open.post_id
		join ${members} ${a} on ${a.id} = ${p.memberId}
		left join lateral (
			select ${moderationDecisions.outcome}, ${moderationDecisions.category}, ${moderationDecisions.reason}, ${moderationDecisions.createdAt}
			from ${moderationDecisions}
			where ${moderationDecisions.postId} = ${p.id} and ${moderationDecisions.model} not like ${`${HUMAN_MODEL}%`}
			order by ${moderationDecisions.createdAt} desc limit 1
		) ${d} on true
		where ${p.deletedAt} is null
		order by open.latest desc, ${p.id}
		limit ${limit}`);

  const items = rows.map((row): ModerationItem => ({
    id: row.id,
    content: sanitisePostHtml(row.content),
    status: row.status,
    isReply: row.parent_id !== null,
    // A public note's address opens its thread on it; a held reply's thread is its first Post's, when that is public.
    threadPath: row.published_at ? `/swiftter/p/${row.id}` : row.root_id && row.root_public ? `/swiftter/p/${row.root_id}` : null,
    createdAt: iso(row.created_at),
    author: row.display_name ? { id: row.author_id, displayName: row.display_name } : null,
    reports: row.reports.map((report) => ({ kind: report.kind, reason: report.reason, createdAt: iso(report.created_at) })),
    aiDecision: row.ai_outcome ? { outcome: row.ai_outcome, category: row.ai_category, reason: row.ai_reason, createdAt: iso(row.ai_at!) } : null,
  }));

  return { items, total: rows[0]?.total ?? 0 };
}

/**
 * A moderator's decision on a note with open reports or appeals, `note` their
 * optional words (plain text, like a report's reason), in one transaction
 * holding the note's row:
 * - `tear-up`: the app's own tear-up (tearUpInTransaction), as if its author
 *   had; recorded as `blocked`;
 * - `keep`: it stays as it is, public or refused; recorded as its state;
 * - `publish`: a refused note is published after all (approved, published
 *   now, so at the top of the feed); recorded as `approved`.
 * Each appends a decision with `human:<moderatorId>` and settles the note's
 * open reports and appeals. Throws NotModeratorError, PostNotFoundError,
 * InvalidReasonError, AlreadyHandledError (nothing open about it) or
 * NotRefusedError. The caller refreshes the feed (feedChanged).
 */
export async function decide(moderatorId: string, postId: string, action: ModerationAction, note?: unknown): Promise<void> {
  if (!isUuid(postId)) throw new PostNotFoundError();
  const reason = prepareReason(note);

  const author = await getDb().transaction(async (tx) => {
    // Checked inside the transaction too: a role revoked a moment ago no longer decides.
    const role = await tx.select({ memberId: moderators.memberId }).from(moderators).where(eq(moderators.memberId, moderatorId)).for("share");

    if (!role[0]) throw new NotModeratorError();

    // Held until the end: two moderators deciding at once take turns, and the second finds nothing open.
    const [target] = await tx.select({ status: posts.status, deletedAt: posts.deletedAt }).from(posts).where(eq(posts.id, postId)).for("update");

    if (!target) throw new PostNotFoundError();
    const open = await tx
      .select({ id: noteReports.id })
      .from(noteReports)
      .where(and(eq(noteReports.postId, postId), isNull(noteReports.resolvedAt)));

    if (!open[0] || target.deletedAt) throw new AlreadyHandledError("This note was already dealt with.");

    let outcome: "approved" | "blocked" = target.status === "approved" ? "approved" : "blocked";
    let tornUpBy: string | null = null;

    if (action === "tear-up") {
      tornUpBy = await tearUpInTransaction(tx, postId);
      outcome = "blocked";
    } else if (action === "publish") {
      if (target.status !== "blocked") throw new NotRefusedError("Only a refused note can be published after all.");
      await tx
        .update(posts)
        .set({ status: "approved", publishedAt: sql`now()` })
        .where(eq(posts.id, postId));
      outcome = "approved";
    }

    // After the tear-up, which erases the reasons recorded so far: the moderator's own words are the decision's record.
    await tx.insert(moderationDecisions).values({ postId, outcome, category: null, reason, model: `${HUMAN_MODEL}${moderatorId}`, durationMs: null });
    await tx
      .update(noteReports)
      .set({ resolvedAt: sql`now()` })
      .where(and(eq(noteReports.postId, postId), isNull(noteReports.resolvedAt)));

    return tornUpBy;
  });

  if (author) await purgeTombstones(author);
}
