-- Reverts drizzle/0003_posts_thread_id_idx.sql (one additive index, so this is its exact inverse).
--
-- Older code runs fine with the index in place, so rolling back needs this
-- only to return the schema to exactly 0002's. Nothing is lost: an index holds
-- no data of its own.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/down/0003_posts_thread_id_idx.down.sql
BEGIN;

DROP INDEX "posts_thread_id_idx";

-- Forget that 0003 ran, so npm run db:migrate would apply it again.
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1790776931733;

COMMIT;
