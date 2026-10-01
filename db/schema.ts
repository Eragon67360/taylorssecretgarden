import { sql } from "drizzle-orm";
import { type AnyPgColumn, boolean, check, foreignKey, index, integer, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/** A signed-in person who can publish Posts, keyed by their Neon Auth user id (a UUID, as text). */
export const members = pgTable("members", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  username: text("username"),
  avatarUrl: text("avatar_url"),
  isDemo: boolean("is_demo").notNull().default(false),
  /** A test fixture from scripts/seed.ts: development branches only, removed by scripts/unseed.ts. */
  isSeed: boolean("is_seed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Where a Post stands with moderation: only an approved Post is ever public. */
export const POST_STATUSES = ["pending", "approved", "blocked"] as const;

/**
 * A rich-text message a Member publishes on Swiftter, stored as sanitised
 * HTML: a Post, or a reply to one (`parent_id`), in the thread of its first
 * Post (`root_id`).
 *
 * Publishing fails closed: a row is `pending` until moderation approves it,
 * and only rows with `published_at` set are public (docs/adr/0007).
 */
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isDemo: boolean("is_demo").notNull().default(false),
    /** A test fixture from scripts/seed.ts: development branches only, removed by scripts/unseed.ts. */
    isSeed: boolean("is_seed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /**
     * Set when its Member tore it up: its text (and moderation reasons) are
     * erased and it is no longer public; replies and reshares show it as torn
     * up. The row goes later, once nothing refers to it (service/swiftter.ts).
     */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    /** The Post or reply this one answers; null for a Post. */
    parentId: uuid("parent_id"),
    /** The thread's first Post, for every reply; null for a Post. */
    rootId: uuid("root_id"),
    /** The thread this row belongs to: its own id for a Post, its root's for a reply. */
    threadId: uuid("thread_id")
      .notNull()
      .generatedAlwaysAs(sql`coalesce(root_id, id)`),
    status: text("status", { enum: POST_STATUSES }).notNull().default("pending"),
    /** When it became public (approved); null while pending or blocked. The feed's order. */
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    index("posts_created_at_idx").on(table.createdAt.desc()),
    // The feed: public Posts (not replies), newest published first.
    index("posts_feed_idx")
      .on(table.publishedAt.desc(), table.id.desc())
      .where(sql`${table.parentId} is null and ${table.publishedAt} is not null and ${table.deletedAt} is null`),
    index("posts_thread_idx").on(table.rootId, table.createdAt),
    // A thread's public notes in reading order (getThread), without scanning every Post.
    index("posts_thread_id_idx")
      .on(table.threadId, table.createdAt, table.id)
      .where(sql`${table.publishedAt} is not null`),
    index("posts_parent_idx").on(table.parentId),
    index("posts_member_idx").on(table.memberId, table.createdAt.desc()),
    unique("posts_id_thread_key").on(table.id, table.threadId),
    // A reply sits in its parent's thread: the database checks it, not only the app.
    foreignKey({ name: "posts_parent_thread_fk", columns: [table.parentId, table.rootId], foreignColumns: [table.id, table.threadId] }),
    check("posts_reply_shape", sql`(${table.parentId} is null) = (${table.rootId} is null)`),
    check("posts_status_check", sql`${table.status} in ('pending', 'approved', 'blocked')`),
    // Public means approved: published_at is only ever set together with status approved.
    check("posts_published_check", sql`${table.publishedAt} is null or ${table.status} = 'approved'`),
  ],
);

/**
 * A Member resharing someone else's public Post into the feed, with credit to
 * its author. No text of its own, so nothing to moderate. Undoing it sets
 * `deleted_at`; resharing again restores the same row, so undo/redo neither
 * moves it up the feed nor frees a place in the reshare limit.
 */
export const reshares = pgTable(
  "reshares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references((): AnyPgColumn => posts.id),
    isSeed: boolean("is_seed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("reshares_member_post_key").on(table.memberId, table.postId),
    index("reshares_feed_idx")
      .on(table.createdAt.desc(), table.id.desc())
      .where(sql`${table.deletedAt} is null`),
    index("reshares_post_idx").on(table.postId),
  ],
);

/** What one moderation attempt concluded: a verdict, or none (Gateway down, timeout, unusable answer). */
export const MODERATION_OUTCOMES = ["approved", "blocked", "unavailable"] as const;

/**
 * Every moderation attempt on a Post or reply, appended, never updated: the
 * history behind `posts.status`, so decisions are auditable and reversible.
 */
export const moderationDecisions = pgTable(
  "moderation_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    outcome: text("outcome", { enum: MODERATION_OUTCOMES }).notNull(),
    /** For a refusal: insult, restricted or off_topic (lib/swiftter.ts RefusalCategory). */
    category: text("category"),
    /** The model's one-line reason; erased when the Post is torn up. */
    reason: text("reason"),
    /** The model that judged it (or `fake` in tests), or `human:<member id>` for a moderator's decision. */
    model: text("model").notNull(),
    /** How long the attempt took, in milliseconds. */
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("moderation_decisions_post_idx").on(table.postId, table.createdAt),
    check("moderation_decisions_outcome_check", sql`${table.outcome} in ('approved', 'blocked', 'unavailable')`),
  ],
);

/**
 * The Members who may handle reports and appeals on the moderation page
 * (/guestbook/moderation): a row each, so a grant says when it was made and
 * by whom (null: by the owner, with `npm run moderator` or the Grant moderator
 * workflow). Revoking deletes the row; the decisions a moderator made stay in
 * moderation_decisions (`model` `human:<their id>`). Goes with the Member.
 */
export const moderators = pgTable("moderators", {
  memberId: text("member_id")
    .primaryKey()
    .references(() => members.id, { onDelete: "cascade" }),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  grantedBy: text("granted_by").references(() => members.id, { onDelete: "set null" }),
});

/** What a Member asks a human for: to look at someone else's public note, or to look again at their own refused one. */
export const NOTE_REPORT_KINDS = ["report", "appeal"] as const;

/**
 * A Member asking a human to look at a note: a `report` of someone else's
 * public note, or an `appeal` of their own refused one ("ask a human to look
 * again"). One of each kind per Member and note. The hourly cron sums up the
 * ones not yet sent to the owner (`notified_at`) in one owner alert per run;
 * the owner sets `resolved_at` once handled, and the daily purge removes
 * resolved ones after 30 days. They go with their note (on delete cascade).
 */
export const noteReports = pgTable(
  "note_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: NOTE_REPORT_KINDS }).notNull(),
    /** The Member's own words, plain text (lib/swiftter.ts MAX_REPORT_REASON_CHARACTERS); never put in the public owner alert. */
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** When the owner alert summing it up went out. */
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    /** When the owner handled it. */
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    unique("note_reports_post_member_kind_key").on(table.postId, table.memberId, table.kind),
    index("note_reports_member_idx").on(table.memberId, table.createdAt.desc()),
    // The cron's question: what has not been sent to the owner yet.
    index("note_reports_unnotified_idx")
      .on(table.createdAt)
      .where(sql`${table.notifiedAt} is null and ${table.resolvedAt} is null`),
    check("note_reports_kind_check", sql`${table.kind} in ('report', 'appeal')`),
    // The app counts graphemes (500); this ceiling only stops a reason written some other way from growing without bound.
    check("note_reports_reason_check", sql`${table.reason} is null or char_length(${table.reason}) <= 2000`),
  ],
);
