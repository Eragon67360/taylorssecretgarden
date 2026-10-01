-- The one thing the app's least-privilege role (swiftter_app, db/roles/swiftter_app.sql)
-- may do in Neon Auth's schema: delete one account by its id, when a Member
-- deletes theirs (deleteMemberAccount, docs/adr/0008). The role has no access
-- to `neon_auth` at all; this function runs with its owner's rights instead
-- (SECURITY DEFINER), the role that ran the migrations (neondb_owner on Neon,
-- a member of `neon_auth`).
--
-- Safe on any database, any number of times: CREATE OR REPLACE keeps the
-- function's grants, PL/pgSQL only looks `neon_auth` up when called (so a
-- plain Postgres without Neon Auth still migrates), and the grant below
-- happens only where the role exists.
--
-- - A fixed search_path: a caller's own search_path cannot slip another
--   object in. Everything in the body is schema-qualified anyway; pg_temp,
--   listed last, cannot shadow pg_catalog either.
-- - An id that is not a UUID (Neon Auth's ids are) deletes nothing instead of
--   failing the cast: the integration tests' Members have ids of their own.
-- - Sessions, accounts (credentials), organisation memberships and
--   invitations go with the user: their foreign keys are ON DELETE CASCADE.
-- - Returns whether an account was deleted (at most one: id is the key).
CREATE OR REPLACE FUNCTION public.delete_auth_user(user_id text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
	IF user_id IS NULL OR user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
		RETURN false;
	END IF;

	DELETE FROM neon_auth."user" WHERE id = user_id::uuid;

	RETURN FOUND;
END;
$$;
--> statement-breakpoint
-- New functions are executable by everyone (PUBLIC) unless revoked.
REVOKE ALL ON FUNCTION public.delete_auth_user(text) FROM PUBLIC;
--> statement-breakpoint
-- Where the app's role was created before this migration ran (or the down
-- script dropped and this recreated the function), give it back its only way
-- in. Elsewhere db/roles/swiftter_app.sql grants it.
DO $$
BEGIN
	IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'swiftter_app') THEN
		GRANT EXECUTE ON FUNCTION public.delete_auth_user(text) TO swiftter_app;
	END IF;
END;
$$;
