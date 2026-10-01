-- Reverts drizzle/0004_note_reports.sql (one new table, so this is its exact inverse).
--
-- Older code never reads note_reports, so rolling back needs this only to
-- return the schema to exactly 0003's. It deletes every report and appeal:
-- export them first if any are unresolved.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/down/0004_note_reports.down.sql
BEGIN;

DROP TABLE "note_reports";

-- Forget that 0004 ran, so npm run db:migrate would apply it again.
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1790840851273;

COMMIT;
