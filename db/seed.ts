/* eslint-disable no-console -- command-line script: its output is the report */
// Inserts Swiftter's demo Members and Posts (is_demo = true) into the database
// at DATABASE_URL. Idempotent: every row has a fixed id, so running it again
// changes nothing. Usage: npm run db:seed
import { drizzle } from "drizzle-orm/node-postgres";

import { createPool } from "./client";
import { members, posts } from "./schema";

// Fictional fans. Their ids cannot collide with Neon Auth user ids (UUIDs).
const demoMembers = [
	{ id: "demo_juniper", displayName: "Juniper Wells", username: "juniper_in_cardigan" },
	{ id: "demo_marcus", displayName: "Marcus Hale", username: "marcus13" },
	{ id: "demo_ines", displayName: "Inès Carvalho", username: "august_sipped_away" },
	{ id: "demo_theo", displayName: "Theo Park", username: "theo_eras_tour" },
] as const;

type DemoMemberId = (typeof demoMembers)[number]["id"];

const demoPosts: { id: string; memberId: DemoMemberId; createdAt: string; content: string }[] = [
	{
		id: "5d1c0a3e-0001-4a6f-9c1e-5d1c0a3e0001",
		memberId: "demo_juniper",
		createdAt: "2026-09-01T09:12:00Z",
		content: "<p>Rainy morning, oversized <strong>cardigan</strong>, <em>folklore</em> on repeat. Some things never change.</p>",
	},
	{
		id: "5d1c0a3e-0002-4a6f-9c1e-5d1c0a3e0002",
		memberId: "demo_marcus",
		createdAt: "2026-09-02T18:40:00Z",
		content: "<p>Ranking the bridges, top three, no notes:</p><ol><li>Out of the Woods</li><li>Cruel Summer</li><li>All Too Well (10 Minute Version)</li></ol>",
	},
	{
		id: "5d1c0a3e-0003-4a6f-9c1e-5d1c0a3e0003",
		memberId: "demo_ines",
		createdAt: "2026-09-04T21:05:00Z",
		content: "<p>Still thinking about the surprise songs from Lisbon. The mashup of <em>august</em> and <em>Gorgeous</em> should not have worked, and yet.</p>",
	},
	{
		id: "5d1c0a3e-0004-4a6f-9c1e-5d1c0a3e0004",
		memberId: "demo_theo",
		createdAt: "2026-09-06T13:30:00Z",
		content: "<p>Friendship bracelet inventory before the next show:</p><ul><li>KARMA</li><li>LONG LIVE</li><li>ENCHANTED</li></ul><p>Accepting trades.</p>",
	},
	{
		id: "5d1c0a3e-0005-4a6f-9c1e-5d1c0a3e0005",
		memberId: "demo_juniper",
		createdAt: "2026-09-08T08:00:00Z",
		content: "<p>Unpopular opinion: <strong>evermore</strong> is the better sister record. <em>marjorie</em> alone settles it.</p>",
	},
	{
		id: "5d1c0a3e-0006-4a6f-9c1e-5d1c0a3e0006",
		memberId: "demo_marcus",
		createdAt: "2026-09-10T19:22:00Z",
		content: "<p>Re-listened to <em>Red (Taylor's Version)</em> front to back on a long drive. The vault tracks hold up.</p>",
	},
	{
		id: "5d1c0a3e-0007-4a6f-9c1e-5d1c0a3e0007",
		memberId: "demo_ines",
		createdAt: "2026-09-13T16:48:00Z",
		content: "<p>Made a playlist that goes through every Era in order, one song each. Harder than it sounds.</p>",
	},
	{
		id: "5d1c0a3e-0008-4a6f-9c1e-5d1c0a3e0008",
		memberId: "demo_theo",
		createdAt: "2026-09-16T22:10:00Z",
		content: "<p>The <strong>reputation</strong> stage set lives rent free in my head. Snakes everywhere and nobody blinked.</p>",
	},
	{
		id: "5d1c0a3e-0009-4a6f-9c1e-5d1c0a3e0009",
		memberId: "demo_juniper",
		createdAt: "2026-09-20T10:35:00Z",
		content: "<p>Teaching my little sister the lyrics to <em>Fifteen</em>. She is nine. The prophecy continues.</p>",
	},
	{
		id: "5d1c0a3e-0010-4a6f-9c1e-5d1c0a3e0010",
		memberId: "demo_marcus",
		createdAt: "2026-09-24T17:55:00Z",
		content: "<p>Which Era are you in this week? I am firmly in <strong>1989</strong>, windows down.</p>",
	},
];

async function main() {
	const pool = createPool();
	const db = drizzle(pool);

	try {
		await db
			.insert(members)
			.values(demoMembers.map((member) => ({ ...member, isDemo: true })))
			.onConflictDoNothing({ target: members.id });
		await db
			.insert(posts)
			.values(demoPosts.map((post) => ({ ...post, createdAt: new Date(post.createdAt), isDemo: true })))
			.onConflictDoNothing({ target: posts.id });
		console.log(`Seeded ${demoMembers.length} demo Members and ${demoPosts.length} demo Posts.`);
	} finally {
		await pool.end();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
