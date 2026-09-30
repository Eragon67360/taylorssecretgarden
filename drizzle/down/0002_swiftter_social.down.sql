-- Reverts drizzle/0002_swiftter_social.sql (additive, so this is its exact inverse).
--
-- Run it BEFORE rolling production back to code older than migration 0002
-- (Vercel Instant Rollback keeps the database): that code does not know
-- replies or moderation states and would show them as ordinary Posts. So
-- replies and never-approved rows are hidden first (deleted_at set, their text
-- kept), not deleted. What only exists since 0002 goes with it: reshares, the
-- moderation history and the thread links.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/down/0002_swiftter_social.down.sql
BEGIN;

UPDATE "posts" SET "deleted_at" = coalesce("deleted_at", now()) WHERE "parent_id" IS NOT NULL OR "published_at" IS NULL;

DROP TABLE "moderation_decisions";
DROP TABLE "reshares";

ALTER TABLE "posts" DROP CONSTRAINT "posts_parent_thread_fk";
ALTER TABLE "posts" DROP CONSTRAINT "posts_id_thread_key";
ALTER TABLE "posts" DROP CONSTRAINT "posts_reply_shape";
ALTER TABLE "posts" DROP CONSTRAINT "posts_status_check";
ALTER TABLE "posts" DROP CONSTRAINT "posts_published_check";
DROP INDEX "posts_feed_idx";
DROP INDEX "posts_thread_idx";
DROP INDEX "posts_parent_idx";
DROP INDEX "posts_member_idx";
ALTER TABLE "posts" DROP COLUMN "thread_id";
ALTER TABLE "posts" DROP COLUMN "parent_id";
ALTER TABLE "posts" DROP COLUMN "root_id";
ALTER TABLE "posts" DROP COLUMN "status";
ALTER TABLE "posts" DROP COLUMN "published_at";
ALTER TABLE "posts" DROP COLUMN "is_seed";
ALTER TABLE "members" DROP COLUMN "is_seed";

-- Forget that 0002 ran, so npm run db:migrate would apply it again.
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1790727282876;

COMMIT;
