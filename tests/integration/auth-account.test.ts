import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { getDb } from "@/db/client";
import { deleteMemberAccount, ensureMember } from "@/service/swiftter";

import { skipReason } from "./setup";

/*
  Neon Auth's accounts, as the app reaches them: only through
  public.delete_auth_user (drizzle/0005, docs/adr/0008). These run as
  whichever role DATABASE_URL names: the owner (CI, a dev branch), which can
  make a Neon Auth account to delete, or the app's swiftter_app
  (db/roles/swiftter_app.sql), which must not even see that schema.
*/

/** Whether Neon Auth's schema is here, and open to this connection's role (the owner) or closed (swiftter_app). */
async function neonAuthAccess(): Promise<"absent" | "open" | "closed"> {
  const { rows } = await getDb().execute<{ access: "absent" | "open" | "closed" }>(sql`
		select case
			when to_regnamespace('neon_auth') is null then 'absent'
			when has_schema_privilege('neon_auth', 'usage') then 'open'
			else 'closed'
		end as access`);

  return rows[0].access;
}

const access = skipReason ? "absent" : await neonAuthAccess();

const deleteAuthUser = async (id: string | null) =>
  (await getDb().execute<{ deleted: boolean }>(sql`select public.delete_auth_user(${id}) as deleted`)).rows[0].deleted;

/** How many of these rows of Neon Auth's tables exist, keyed by the user's id. */
async function authRows(userId: string) {
  const { rows } = await getDb().execute<{ users: number; sessions: number; accounts: number }>(sql`
		select (select count(*)::int from neon_auth."user" where id = ${userId}::uuid) as users,
			(select count(*)::int from neon_auth.session where "userId" = ${userId}::uuid) as sessions,
			(select count(*)::int from neon_auth.account where "userId" = ${userId}::uuid) as accounts`);

  return rows[0];
}

/** A Neon Auth account with a session and a password credential, made directly (owner only), deleted by the caller. */
async function newAuthUser(): Promise<string> {
  const id = randomUUID();

  await getDb().transaction(async (tx) => {
    await tx.execute(sql`
			insert into neon_auth."user" (id, name, email, "emailVerified") values (${id}::uuid, 'Auth Fixture', ${`auth-fixture-${id}@example.invalid`}, false)`);
    await tx.execute(sql`
			insert into neon_auth.session ("userId", token, "expiresAt", "updatedAt") values (${id}::uuid, ${randomUUID()}, now() + interval '1 hour', now())`);
    await tx.execute(sql`
			insert into neon_auth.account ("userId", "accountId", "providerId", password, "updatedAt") values (${id}::uuid, ${id}, 'credential', 'not-a-hash', now())`);
  });

  return id;
}

describe.skipIf(!!skipReason || access === "absent")("Neon Auth accounts through public.delete_auth_user", () => {
  it("runs as its owner, with a fixed search_path, and is executable by no one by default", async () => {
    const { rows } = await getDb().execute<{ security_definer: boolean; config: string[] | null; public_execute: boolean; acl_set: boolean }>(sql`
			select p.prosecdef as security_definer, p.proconfig as config, p.proacl is not null as acl_set,
				exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') as public_execute
			from pg_proc p where p.oid = 'public.delete_auth_user(text)'::regprocedure`);

    // A null ACL would mean the default one, which lets PUBLIC execute.
    expect(rows[0]).toEqual({ security_definer: true, config: ["search_path=pg_catalog, pg_temp"], public_execute: false, acl_set: true });
  });

  it("deletes nothing for an id that is no Neon Auth account", async () => {
    expect(await deleteAuthUser(`it_${randomUUID()}`)).toBe(false);
    expect(await deleteAuthUser(randomUUID())).toBe(false);
    expect(await deleteAuthUser('\'; delete from neon_auth."user"; --')).toBe(false);
    expect(await deleteAuthUser(null)).toBe(false);
  });

  it.runIf(access === "open")("deleting a Member's account deletes their Neon Auth user, sessions and credentials, and no one else's", async () => {
    const [leaving, staying] = [await newAuthUser(), await newAuthUser()];

    try {
      await ensureMember({ id: leaving, displayName: "Leaving Through Auth", username: null, avatarUrl: null });
      await deleteMemberAccount(leaving);

      expect(await authRows(leaving)).toEqual({ users: 0, sessions: 0, accounts: 0 });
      expect(await authRows(staying)).toEqual({ users: 1, sessions: 1, accounts: 1 });
      // Already gone: a second call deletes nothing.
      expect(await deleteAuthUser(leaving)).toBe(false);
      expect(await deleteAuthUser(staying)).toBe(true);
    } finally {
      await getDb().execute(sql`delete from neon_auth."user" where id in (${leaving}::uuid, ${staying}::uuid)`);
      await getDb().execute(sql`delete from members where id = ${leaving}`);
    }
  });

  it.runIf(access === "closed")("the app's role sees nothing of Neon Auth: no emails, no password hashes, no deleting by hand", async () => {
    await expect(getDb().execute(sql`select * from neon_auth."user" limit 1`)).rejects.toMatchObject({ cause: { code: "42501" } });
    await expect(getDb().execute(sql`select * from neon_auth.account limit 1`)).rejects.toMatchObject({ cause: { code: "42501" } });
    await expect(getDb().execute(sql`delete from neon_auth."user" where id = ${randomUUID()}::uuid`)).rejects.toMatchObject({ cause: { code: "42501" } });
    await expect(getDb().execute(sql`select * from drizzle.__drizzle_migrations limit 1`)).rejects.toMatchObject({ cause: { code: "42501" } });
  });
});
