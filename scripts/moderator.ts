/* eslint-disable no-console -- command-line script: its output is the report */
// Grants or revokes the moderator role (the `moderators` table, #166): who may
// handle reports and appeals on /guestbook/moderation. The owner's tool, with
// the owner's connection (it may read `neon_auth` to find a Member).
//
// Usage:
//   npm run moderator -- grant <member id or email>
//   npm run moderator -- revoke <member id or email>
//   npm run moderator -- list
//
// A Member id is the last part of their Member page's address
// (/swiftter/m/<id>). Someone who never passed a note has no Member row yet:
// granting makes it from their Neon Auth account.
//
// On production only with --production, which the Grant moderator workflow
// passes (.github/workflows/grant-moderator.yml): its credentials are on no
// laptop. There, only a Member id is accepted, and only ids are printed: the
// workflow's log is public, like the repository. Never with NODE_ENV or
// VERCEL_ENV=production (db/guard.ts moderatorGuard).
import { moderatorGuard } from "../db/guard";

const args = process.argv.slice(2);
const production = args.includes("--production");
const [action, who] = args.filter((arg) => arg !== "--production");
const USAGE = "Usage: npm run moderator -- grant|revoke <member id or email> [--production], or npm run moderator -- list [--production]";

const refusal = moderatorGuard(process.env, { production });

if (refusal) {
  console.error(`Refusing to change moderators: ${refusal}.`);
  process.exit(1);
}

/** Neon Auth ids are UUIDs, the demo Members' `demo_juniper` (service/members.ts isMemberId). */
const MEMBER_ID = /^[\w-]{1,64}$/;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  if (action === "list" ? who !== undefined : !["grant", "revoke"].includes(action ?? "") || !who) fail(USAGE);

  const isEmail = !!who?.includes("@");

  if (isEmail && production) fail("On production, name the Member by id, not email: the workflow's log is public.");
  if (who && !isEmail && !MEMBER_ID.test(who)) fail(`"${who}" is not a Member id (the end of /swiftter/m/<id>) or an email.`);

  // Imported after the guard: nothing connects before it passed.
  const { sql } = await import("drizzle-orm");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { createPool } = await import("../db/client");
  const { displayNameOf } = await import("../lib/display-name");

  const pool = createPool();
  const db = drizzle(pool);

  try {
    if (action === "list") {
      const { rows } = await db.execute<{ member_id: string; granted_at: string }>(sql`select member_id, granted_at::text from moderators order by granted_at`);

      console.log(rows.length ? rows.map((row) => `${row.member_id} (since ${row.granted_at})`).join("\n") : "No moderators.");

      return;
    }

    const { rows: auth } = await db.execute<{ exists: boolean }>(sql`select to_regclass('neon_auth."user"') is not null as exists`);
    const hasAuth = auth[0].exists;
    // The Neon Auth account behind an email, or behind an id that has no Member row yet.
    const account = async (where: ReturnType<typeof sql>) =>
      hasAuth
        ? (await db.execute<{ id: string; name: string | null; email: string }>(sql`select id::text, name, email from neon_auth."user" where ${where}`)).rows[0]
        : undefined;

    let id = who!;

    if (isEmail) {
      const found = await account(sql`lower(email) = lower(${who})`);

      if (!found) fail("No account has that email.");
      id = found.id;
    }

    if (action === "revoke") {
      const { rowCount } = await db.execute(sql`delete from moderators where member_id = ${id}`);

      console.log(rowCount ? `Revoked: ${id} is no longer a moderator.` : `${id} was not a moderator: nothing changed.`);

      return;
    }

    const { rows: member } = await db.execute<{ id: string }>(sql`select id from members where id = ${id}`);

    if (!member[0]) {
      // Their Member row, as signing in and writing would make it (service/swiftter.ts ensureMember, without the avatar).
      const found = await account(sql`id::text = ${id}`);

      if (!found) fail(`No Member and no account has the id ${id}.`);
      await db.execute(sql`insert into members (id, display_name) values (${found.id}, ${displayNameOf(found)}) on conflict (id) do nothing`);
    }

    const { rowCount } = await db.execute(sql`insert into moderators (member_id) values (${id}) on conflict (member_id) do nothing`);

    console.log(rowCount ? `Granted: ${id} is a moderator.` : `${id} was already a moderator: nothing changed.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
