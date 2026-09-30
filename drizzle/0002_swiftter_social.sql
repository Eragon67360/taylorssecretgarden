-- Swiftter becomes a social feed: replies (in posts), reshares, stored moderation
-- decisions, and the is_seed marker for development fixtures. Additive only;
-- drizzle/down/0002_swiftter_social.down.sql reverts it (see its header).
CREATE TABLE "moderation_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"outcome" text NOT NULL,
	"category" text,
	"reason" text,
	"model" text NOT NULL,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_decisions_outcome_check" CHECK ("moderation_decisions"."outcome" in ('approved', 'blocked', 'unavailable'))
);
--> statement-breakpoint
CREATE TABLE "reshares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" text NOT NULL,
	"post_id" uuid NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "is_seed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "is_seed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "parent_id" uuid;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "root_id" uuid;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "thread_id" uuid GENERATED ALWAYS AS (coalesce(root_id, id)) STORED NOT NULL;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "published_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "status" text DEFAULT 'approved' NOT NULL;
--> statement-breakpoint
-- Every existing row was moderated before it was stored (or predates moderation): approved, and public unless torn up.
UPDATE "posts" SET "published_at" = "created_at" WHERE "deleted_at" IS NULL;
--> statement-breakpoint
-- From now on a row is pending until moderation approves it: publishing fails closed.
ALTER TABLE "posts" ALTER COLUMN "status" SET DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE "moderation_decisions" ADD CONSTRAINT "moderation_decisions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reshares" ADD CONSTRAINT "reshares_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reshares" ADD CONSTRAINT "reshares_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "moderation_decisions_post_idx" ON "moderation_decisions" USING btree ("post_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "reshares_member_post_key" ON "reshares" USING btree ("member_id","post_id");
--> statement-breakpoint
CREATE INDEX "reshares_feed_idx" ON "reshares" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "reshares"."deleted_at" is null;
--> statement-breakpoint
CREATE INDEX "reshares_post_idx" ON "reshares" USING btree ("post_id");
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_id_thread_key" UNIQUE("id","thread_id");
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_parent_thread_fk" FOREIGN KEY ("parent_id","root_id") REFERENCES "public"."posts"("id","thread_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "posts_feed_idx" ON "posts" USING btree ("published_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "posts"."parent_id" is null and "posts"."published_at" is not null and "posts"."deleted_at" is null;
--> statement-breakpoint
CREATE INDEX "posts_thread_idx" ON "posts" USING btree ("root_id","created_at");
--> statement-breakpoint
CREATE INDEX "posts_parent_idx" ON "posts" USING btree ("parent_id");
--> statement-breakpoint
CREATE INDEX "posts_member_idx" ON "posts" USING btree ("member_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_reply_shape" CHECK (("posts"."parent_id" is null) = ("posts"."root_id" is null));
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_status_check" CHECK ("posts"."status" in ('pending', 'approved', 'blocked'));
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_published_check" CHECK ("posts"."published_at" is null or "posts"."status" = 'approved');
