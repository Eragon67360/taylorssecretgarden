import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** A signed-in person who can publish Posts, keyed by their Clerk user id. */
export const members = pgTable("members", {
	id: text("id").primaryKey(),
	displayName: text("display_name").notNull(),
	username: text("username"),
	avatarUrl: text("avatar_url"),
	isDemo: boolean("is_demo").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A rich-text message a Member publishes on Swiftter, stored as sanitised HTML. */
export const posts = pgTable(
	"posts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		memberId: text("member_id")
			.notNull()
			.references(() => members.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		isDemo: boolean("is_demo").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("posts_created_at_idx").on(table.createdAt.desc())],
);
