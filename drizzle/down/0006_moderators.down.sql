-- Reverts drizzle/0006_moderators.sql (one new table, so this is its exact inverse).
--
-- Older code never reads moderators, so rolling back needs this only to
-- return the schema to exactly 0005's. It forgets who the moderators are
-- (their decisions stay in moderation_decisions, as `human:<member id>`):
-- note them first, to grant them again later.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/down/0006_moderators.down.sql
BEGIN;

DROP TABLE "moderators";

-- Forget that 0006 ran, so npm run db:migrate would apply it again.
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1790862149240;

COMMIT;
