-- Reverts drizzle/0005_delete_auth_user.sql (one new function, so this is its exact inverse).
--
-- Code from 0005 on deletes Neon Auth accounts only through this function:
-- run this only when rolling back to older code, and only once the app is
-- back on the owner's connection string (older code deletes from
-- `neon_auth."user"` itself, which swiftter_app may not).
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/down/0005_delete_auth_user.down.sql
BEGIN;

DROP FUNCTION public.delete_auth_user(text);

-- Forget that 0005 ran, so npm run db:migrate would apply it again.
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1790844406170;

COMMIT;
