-- swiftter_app: the database role the running app connects as (Vercel's
-- DATABASE_URL), with only what Swiftter needs (issue #83, docs/adr/0008).
--
-- Not a migration: roles belong to a Neon branch's environment, not to the
-- schema, and the password must never be in git. The owner runs this once per
-- long-lived branch (production, then dev), as neondb_owner, AFTER
-- `npm run db:migrate` has applied drizzle/0005 there (it grants that
-- migration's function). Migrations, the seed scripts and the backup keep
-- connecting as neondb_owner. See README, "Database roles".
--
-- In the Neon console's SQL editor: replace :'password' below with a quoted
-- password of your own ('…'), run the whole script, and do not save the edited
-- copy. With psql, pass it instead, so it is in no file and no history:
--
--   read -rs PW && psql "$OWNER_DATABASE_URL" -v ON_ERROR_STOP=1 -v password="$PW" -f db/roles/swiftter_app.sql
--
-- Everything after CREATE ROLE can be run again (to re-grant after a schema
-- change, say) on its own.

-- A role created in SQL, not in the Neon console: the console makes every role
-- it creates a member of neon_superuser (CREATEROLE, CREATEDB, BYPASSRLS),
-- which is everything this role must not have. Only LOGIN, with a password
-- (Neon wants at least 60 bits of entropy: `openssl rand -hex 24` gives 192,
-- and hex needs no escaping in a connection string);
-- every other attribute spelt out as off. NOINHERIT: should it ever be made a
-- member of another role, it still would not get that role's rights.
CREATE ROLE swiftter_app LOGIN PASSWORD :'password'
	NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;

-- Connecting to this database. PUBLIC can already (Neon's default), but the
-- app should not depend on that default staying. In a DO block because the
-- database's name is current_database(), whatever the branch calls it.
DO $$
BEGIN
	EXECUTE format('GRANT CONNECT ON DATABASE %I TO swiftter_app', current_database());
END;
$$;

-- Looking things up in `public`, where Swiftter's tables are (USAGE only: it
-- can create nothing there; tables are made by migrations, as neondb_owner).
GRANT USAGE ON SCHEMA public TO swiftter_app;

-- Reading and writing rows of Swiftter's tables, and nothing else: no
-- TRUNCATE, REFERENCES or TRIGGER, no ALTER or DROP (it owns nothing).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO swiftter_app;

-- Sequences, for any serial or identity column (Swiftter's ids are UUIDs
-- today, so this grants nothing yet): nextval and currval.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO swiftter_app;

-- The same for tables and sequences later migrations create: they run as
-- neondb_owner, so its default privileges in `public` cover them, and a new
-- table needs no new grant.
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
	GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO swiftter_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
	GRANT USAGE, SELECT ON SEQUENCES TO swiftter_app;

-- Its only way into Neon Auth's data: deleting one account by id, when a
-- Member deletes theirs (drizzle/0005_delete_auth_user.sql, SECURITY DEFINER).
GRANT EXECUTE ON FUNCTION public.delete_auth_user(text) TO swiftter_app;

-- Explicitly none of Neon Auth's schema (emails, password hashes, sessions)
-- nor drizzle's (the migrations' journal). Neither was ever granted: these
-- only make sure, and say so. (Postgres answers a warning, not an error, when
-- there was nothing to revoke.)
REVOKE ALL ON SCHEMA neon_auth FROM swiftter_app;
REVOKE ALL ON ALL TABLES IN SCHEMA neon_auth FROM swiftter_app;
REVOKE ALL ON SCHEMA drizzle FROM swiftter_app;
REVOKE ALL ON ALL TABLES IN SCHEMA drizzle FROM swiftter_app;
