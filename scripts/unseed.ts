/* eslint-disable no-console -- command-line script: its output is the report */
// Removes the development fixtures scripts/seed.ts created, and nothing else:
// rows marked `is_seed`, and the six seed accounts by their exact addresses.
// Refuses to run on production, or with NODE_ENV/VERCEL_ENV=production.
//
// Foreign keys are respected: a seed note that a real Member's reply or
// reshare depends on (a tester replied to a fixture) is not deleted but torn
// up (text erased), along with the seed notes above it in its thread, so the
// real content still reads. Everything else seeded is deleted.
//
// Usage:
//   npm run unseed -- --dry-run   counts what would go, changes nothing
//   npm run unseed                removes it, and prints the counts before and after
import { seedGuard } from "../db/guard";

const refusal = seedGuard();

if (refusal) {
	console.error(`Refusing to unseed: ${refusal}.`);
	process.exit(1);
}

type Counts = { members: number; posts: number; replies: number; reshares: number; decisions: number; accounts: number };

async function main() {
	const { sql } = await import("drizzle-orm");
	const { drizzle } = await import("drizzle-orm/node-postgres");
	const { createPool } = await import("../db/client");
	const { SEED_EMAILS } = await import("./seed-data");

	const dryRun = process.argv.includes("--dry-run");
	const pool = createPool();
	const db = drizzle(pool);
	const emails = sql.join(
		SEED_EMAILS.map((email) => sql`${email}`),
		sql`, `,
	);

	const count = async (): Promise<Counts> => {
		const { rows } = await db.execute<Counts>(sql`
			select (select count(*)::int from members where is_seed) as members,
				(select count(*)::int from posts where is_seed and parent_id is null) as posts,
				(select count(*)::int from posts where is_seed and parent_id is not null) as replies,
				(select count(*)::int from reshares where is_seed) as reshares,
				(select count(*)::int from moderation_decisions d join posts p on p.id = d.post_id where p.is_seed) as decisions,
				(select count(*)::int from neon_auth."user" where email in (${emails})) as accounts`);

		return rows[0];
	};

	// Seed notes that must stay (as tombstones): those real content depends on, and their seed ancestors.
	const kept = sql`
		with recursive needed as (
			select p.id, p.parent_id from posts p
			where p.is_seed and (
				exists (select 1 from posts c where c.parent_id = p.id and not c.is_seed)
				or exists (select 1 from reshares r where r.post_id = p.id and not r.is_seed))
			union
			select p.id, p.parent_id from posts p join needed n on p.id = n.parent_id where p.is_seed
		)
		select id from needed`;

	try {
		console.log(`Database: ${new URL(process.env.DATABASE_URL!).host}`);
		const before = await count();
		const { rows: keptRows } = await db.execute<{ id: string }>(kept);

		console.log(`Seed rows now: ${JSON.stringify(before)}.`);
		console.log(`Seed notes real content depends on (to be torn up, not deleted): ${keptRows.length}.`);

		if (dryRun) {
			console.log("Dry run: nothing changed. Run `npm run unseed` to remove them.");

			return;
		}

		await db.transaction(async (tx) => {
			await tx.execute(sql`delete from reshares where is_seed`);
			await tx.execute(sql`update posts set content = '', deleted_at = coalesce(deleted_at, now()) where id in (${kept})`);
			await tx.execute(sql`update moderation_decisions set reason = null where post_id in (${kept})`);
			// One statement: replies and the notes they answer go together (foreign keys are checked at its end).
			await tx.execute(sql`delete from posts where is_seed and id not in (${kept})`);
			await tx.execute(sql`delete from members m where m.is_seed and not exists (select 1 from posts p where p.member_id = m.id)`);
			// The seed accounts, by their exact addresses (sessions and credentials follow, on delete cascade).
			await tx.execute(sql`delete from neon_auth."user" where email in (${emails})`);
		});

		console.log(`Seed rows after: ${JSON.stringify(await count())}.`);
	} finally {
		await pool.end();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
