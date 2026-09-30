/* eslint-disable no-console -- command-line script: its output is the report */
// Development fixtures for Swiftter: six fictional accounts (real Neon Auth
// accounts, one shared test password), 53 Posts across three feed pages, a
// deep and a wide thread, reshares (one of a Post torn up since), and a note
// in every moderation state. Every row is marked `is_seed`; scripts/unseed.ts
// removes them. Idempotent and deterministic (fixed ids and times).
//
// Refuses to run on production, or with NODE_ENV/VERCEL_ENV=production
// (db/guard.ts). Usage: npm run seed   (DATABASE_URL and NEON_AUTH_BASE_URL
// of a development Neon branch, plus NEON_AUTH_COOKIE_SECRET)
import { seedGuard } from "../db/guard";

const refusal = seedGuard();

if (refusal) {
	console.error(`Refusing to seed: ${refusal}.`);
	process.exit(1);
}

async function main() {
	// Imported after the guard: nothing connects before it passed.
	const { sql } = await import("drizzle-orm");
	const { drizzle } = await import("drizzle-orm/node-postgres");
	const { createPool } = await import("../db/client");
	const { preparePost } = await import("../service/swiftter");
	const { SEED_EPOCH, SEED_NOTES, SEED_PASSWORD, SEED_RESHARES, SEED_USERS } = await import("./seed-data");

	const pool = createPool();
	const db = drizzle(pool);
	const at = (minutes: number) => new Date(SEED_EPOCH + minutes * 60_000).toISOString();

	try {
		// 1. Accounts: signed up through Neon Auth, so they can sign in with the shared password.
		const ids = {} as Record<keyof typeof SEED_USERS, string>;
		let accountsCreated = 0;

		for (const [key, { name, email }] of Object.entries(SEED_USERS) as [keyof typeof SEED_USERS, { name: string; email: string }][]) {
			const existing = await db.execute<{ id: string }>(sql`select id from neon_auth."user" where email = ${email}`);

			if (!existing.rows[0]) {
				const response = await fetch(`${process.env.NEON_AUTH_BASE_URL}/sign-up/email`, {
					method: "POST",
					headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
					body: JSON.stringify({ name, email, password: SEED_PASSWORD }),
				});

				if (!response.ok) throw new Error(`Signing up ${email} failed: ${response.status} ${await response.text()}`);
				accountsCreated++;
			}
			const { rows } = await db.execute<{ id: string }>(sql`select id from neon_auth."user" where email = ${email}`);

			ids[key] = rows[0].id;
			await db.execute(sql`
				insert into members (id, display_name, is_seed) values (${rows[0].id}, ${name}, true)
				on conflict (id) do update set display_name = excluded.display_name, is_seed = true`);
		}

		// 2. Notes, parents before replies; each passes the same content checks as the app's.
		let notesCreated = 0;

		for (const note of SEED_NOTES) {
			const content = preparePost(note.html);
			const moderation = note.moderation ?? { status: "approved" as const };
			const published = moderation.status === "approved" ? at(note.at) : null;
			const { rows } = await db.execute<{ id: string }>(sql`
				insert into posts (id, member_id, content, status, published_at, created_at, parent_id, root_id, is_seed)
				select ${note.id}, ${ids[note.by]}, ${content}, ${moderation.status}, ${published}, ${at(note.at)},
					parent.id, parent.thread_id, true
				from (select 1) as one
				left join posts parent on parent.id = ${note.parent ?? null}
				on conflict (id) do nothing
				returning id`);

			if (!rows[0]) continue;
			notesCreated++;
			const outcome = moderation.status === "pending" ? "unavailable" : moderation.status;

			await db.execute(sql`
				insert into moderation_decisions (post_id, outcome, category, reason, model, created_at)
				values (${note.id}, ${outcome}, ${"category" in moderation ? moderation.category : null},
					${"reason" in moderation ? moderation.reason : outcome === "approved" ? "Seed: approved." : null}, 'seed', ${at(note.at)})`);
		}

		// 3. Reshares, then the Post torn up after being reshared.
		let resharesCreated = 0;

		for (const [who, postId, minutes] of SEED_RESHARES) {
			const { rows } = await db.execute(sql`
				insert into reshares (member_id, post_id, created_at, is_seed) values (${ids[who]}, ${postId}, ${at(minutes)}, true)
				on conflict (member_id, post_id) do nothing returning id`);

			resharesCreated += rows.length;
		}
		for (const note of SEED_NOTES.filter((seed) => seed.tornUp)) {
			await db.execute(sql`update posts set content = '', deleted_at = ${at(note.at + 60)} where id = ${note.id} and deleted_at is null`);
		}

		const { rows: totals } = await db.execute<{ members: number; posts: number; replies: number; reshares: number; decisions: number }>(sql`
			select (select count(*)::int from members where is_seed) as members,
				(select count(*)::int from posts where is_seed and parent_id is null) as posts,
				(select count(*)::int from posts where is_seed and parent_id is not null) as replies,
				(select count(*)::int from reshares where is_seed) as reshares,
				(select count(*)::int from moderation_decisions d join posts p on p.id = d.post_id where p.is_seed) as decisions`);

		console.log(`Database: ${new URL(process.env.DATABASE_URL!).host}`);
		console.log(`Created now: ${accountsCreated} accounts, ${notesCreated} notes, ${resharesCreated} reshares (0 on a re-run).`);
		console.log(`Seed rows in the database: ${JSON.stringify(totals[0])}.`);
		console.log(`Sign in as any of ${Object.values(SEED_USERS).map((user) => user.email).join(", ")} with the password "${SEED_PASSWORD}".`);
	} finally {
		await pool.end();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
