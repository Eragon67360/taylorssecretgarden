/* eslint-disable no-console -- command-line script: its output is the report */
// Removes Swiftter's demo Members and Posts (is_demo = true) from the database
// at DATABASE_URL: the rows `npm run db:seed` inserted. Real Members and their
// Posts are never touched.
//
// Usage:
//   npm run db:unseed            shows what would be deleted, deletes nothing
//   npm run db:unseed -- --yes   deletes it
import { and, count, eq, notExists } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import { createPool } from "./client";
import { members, posts } from "./schema";

async function main() {
	const confirmed = process.argv.includes("--yes");
	const pool = createPool();
	const db = drizzle(pool);

	try {
		const host = new URL(process.env.DATABASE_URL ?? "").host;
		const [{ demoPosts }] = await db.select({ demoPosts: count() }).from(posts).where(eq(posts.isDemo, true));
		const [{ demoMembers }] = await db.select({ demoMembers: count() }).from(members).where(eq(members.isDemo, true));

		console.log(`Database: ${host}`);
		console.log(`Demo Posts: ${demoPosts}, demo Members: ${demoMembers}.`);

		if (!confirmed) {
			console.log("Nothing deleted. Run `npm run db:unseed -- --yes` to delete them.");

			return;
		}

		const deleted = await db.transaction(async (tx) => {
			const deletedPosts = await tx.delete(posts).where(eq(posts.isDemo, true)).returning({ id: posts.id });
			// A demo Member is only removed once no Post of theirs is left, so a
			// Member's real Posts can never go with them.
			const deletedMembers = await tx
				.delete(members)
				.where(and(eq(members.isDemo, true), notExists(tx.select().from(posts).where(eq(posts.memberId, members.id)))))
				.returning({ id: members.id });

			return { posts: deletedPosts.length, members: deletedMembers.length };
		});

		console.log(`Deleted ${deleted.posts} demo Posts and ${deleted.members} demo Members. \`npm run db:seed\` brings them back.`);
	} finally {
		await pool.end();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
