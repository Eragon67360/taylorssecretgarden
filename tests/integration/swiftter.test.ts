import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/db/client";
import { LIMITS, MAX_MODERATION_ATTEMPTS } from "@/lib/swiftter";
import {
	AlreadyResharedError,
	checkAgain,
	deletePost,
	getThread,
	listFeed,
	listHeld,
	listOwnReshares,
	listSitemapPosts,
	NoMoreChecksError,
	PostingLimitError,
	PostNotFoundError,
	reshare,
	SelfReshareError,
	unreshare,
	writeNote,
} from "@/service/swiftter";

import { allow, newMember, refuse, removeMembers, skipReason, unavailable } from "./setup";

const note = (text: string) => `<p>${text}</p>`;

/** Every entry of the feed, following cursors to the end. */
async function wholeFeed() {
	const items = [];
	let cursor: string | null = null;

	do {
		const page = await listFeed(cursor);

		items.push(...page.items);
		cursor = page.nextCursor;
	} while (cursor);

	return items;
}

const decisions = async (postId: string) =>
	(await getDb().execute<{ outcome: string; category: string | null; reason: string | null }>(sql`
		select outcome, category, reason from moderation_decisions where post_id = ${postId} order by created_at`)).rows;

describe.skipIf(!!skipReason)("Swiftter service against Postgres", () => {
	afterAll(removeMembers);

	describe("moderation on write", () => {
		it("an approved note is public, with its decision recorded", async () => {
			const alice = await newMember();
			const outcome = await writeNote(alice, note("approved note"), null, allow);

			expect(outcome.status).toBe("approved");
			expect((await listFeed()).items.some((item) => item.kind === "post" && item.post.id === outcome.note.id)).toBe(true);
			expect(await decisions(outcome.note.id)).toEqual([{ outcome: "approved", category: null, reason: "Test: allowed." }]);
		});

		it("a refused note is stored blocked, visible to its author only, with the category and reason", async () => {
			const alice = await newMember();
			const outcome = await writeNote(alice, note("refused note"), null, refuse("off_topic"));

			expect(outcome).toMatchObject({ status: "blocked", category: "off_topic" });
			expect((await wholeFeed()).some((item) => item.post.id === outcome.note.id)).toBe(false);
			expect(await getThread(outcome.note.id)).toBeNull();
			expect(await listHeld(alice)).toEqual([expect.objectContaining({ id: outcome.note.id, status: "blocked", category: "off_topic", reason: "Test: off_topic." })]);
			expect(await listHeld(await newMember())).toEqual([]);
		});

		it("no verdict keeps the note pending (never lost, never public); check again publishes it", async () => {
			const alice = await newMember();
			const outcome = await writeNote(alice, note("pending note"), null, unavailable);

			expect(outcome.status).toBe("pending");
			expect((await wholeFeed()).some((item) => item.post.id === outcome.note.id)).toBe(false);
			expect(await decisions(outcome.note.id)).toEqual([{ outcome: "unavailable", category: null, reason: null }]);

			const again = await checkAgain(alice, outcome.note.id, allow);

			expect(again.status).toBe("approved");
			expect((await listFeed()).items.some((item) => item.post.id === outcome.note.id)).toBe(true);
		});

		it("check again is capped, and only for the author's own pending note", async () => {
			const alice = await newMember();
			const { note: held } = await writeNote(alice, note("stuck note"), null, unavailable);

			await expect(checkAgain(await newMember(), held.id, allow)).rejects.toBeInstanceOf(PostNotFoundError);
			for (let attempt = 2; attempt <= MAX_MODERATION_ATTEMPTS; attempt++) await checkAgain(alice, held.id, unavailable);
			await expect(checkAgain(alice, held.id, allow)).rejects.toBeInstanceOf(NoMoreChecksError);
			expect(await decisions(held.id)).toHaveLength(MAX_MODERATION_ATTEMPTS);
		});

		it("a verdict arriving after the author tore the note up never brings it back", async () => {
			const alice = await newMember();
			const { note: held } = await writeNote(alice, note("regretted note"), null, unavailable);
			const outcome = checkAgain(alice, held.id, async () => {
				await deletePost(alice, held.id);

				return allow();
			});

			await expect(outcome).rejects.toBeInstanceOf(PostNotFoundError);
			const { rows } = await getDb().execute<{ published_at: Date | null; content: string }>(sql`select published_at, content from posts where id = ${held.id}`);

			expect(rows[0]).toEqual({ published_at: null, content: "" });
		});
	});

	describe("replies", () => {
		it("threads nest, every reply keeps its thread's root, and the root counts its public replies", async () => {
			const [alice, bob, cleo] = [await newMember(), await newMember(), await newMember()];
			const { note: root } = await writeNote(alice, note("root"), null, allow);
			const { note: first } = await writeNote(bob, note("reply"), root.id, allow);
			const { note: second } = await writeNote(cleo, note("reply to the reply"), first.id, allow);

			await writeNote(cleo, note("refused reply"), root.id, refuse());

			const thread = await getThread(second.id);

			expect(thread?.root.id).toBe(root.id);
			expect(thread?.replies.map((reply) => [reply.id, reply.parentId])).toEqual([
				[first.id, root.id],
				[second.id, first.id],
			]);
			const { rows } = await getDb().execute<{ root_id: string }>(sql`select root_id from posts where id = ${second.id}`);

			expect(rows[0].root_id).toBe(root.id);
			expect((await listFeed()).items.find((item) => item.post.id === root.id)).toMatchObject({ post: { replyCount: 2 } });
		});

		it("a reply to a note that is not public (held, torn up, missing) is refused", async () => {
			const [alice, bob] = [await newMember(), await newMember()];
			const { note: held } = await writeNote(alice, note("held"), null, unavailable);
			const { note: torn } = await writeNote(alice, note("torn"), null, allow);

			await deletePost(alice, torn.id);
			for (const parent of [held.id, torn.id, "00000000-0000-4000-8000-000000000000", "not-a-uuid"]) {
				await expect(writeNote(bob, note("reply"), parent, allow)).rejects.toBeInstanceOf(PostNotFoundError);
			}
		});

		it("the database itself refuses a reply outside its parent's thread", async () => {
			const alice = await newMember();
			const { note: a } = await writeNote(alice, note("thread a"), null, allow);
			const { note: b } = await writeNote(alice, note("thread b"), null, allow);

			const error = await getDb()
				.execute(sql`insert into posts (member_id, content, parent_id, root_id) values (${alice}, 'x', ${a.id}, ${b.id})`)
				.catch((failure: unknown) => failure);

			// Drizzle wraps Postgres' error; the constraint is on its cause.
			expect((error as { cause?: { constraint?: string } }).cause?.constraint).toBe("posts_parent_thread_fk");
		});

		it("concurrent replies from many Members are all counted", async () => {
			const alice = await newMember();
			const { note: root } = await writeNote(alice, note("popular"), null, allow);
			const repliers = await Promise.all(Array.from({ length: 8 }, () => newMember()));

			await Promise.all(repliers.map((member) => writeNote(member, note("me too"), root.id, allow)));

			expect((await getThread(root.id))?.replies).toHaveLength(8);
			expect((await listFeed()).items.find((item) => item.post.id === root.id)).toMatchObject({ post: { replyCount: 8 } });
		});

		it("a thread's public notes are read through their own index, not a scan of every Post", async () => {
			const alice = await newMember();
			const { note: root } = await writeNote(alice, note("indexed"), null, allow);
			// A test database holds too few Posts for the planner to prefer an index on its own.
			const plan = await getDb().transaction(async (tx) => {
				await tx.execute(sql`set local enable_seqscan = off`);

				return (await tx.execute<{ "QUERY PLAN": string }>(sql`
					explain select id from posts
					where thread_id = ${root.id} and published_at is not null
					order by created_at, id`)).rows.map((row) => row["QUERY PLAN"]).join("\n");
			});

			expect(plan).toContain("posts_thread_id_idx");
			expect(plan).not.toContain("Sort");
		});
	});

	describe("reshares", () => {
		it("reshare with attribution; no self-reshare, no duplicate, not a reply; undo and redo keep the same entry", async () => {
			const [alice, bob] = [await newMember("Alice Author"), await newMember("Bob Resharer")];
			const { note: post } = await writeNote(alice, note("worth resharing"), null, allow);
			const { note: reply } = await writeNote(bob, note("a reply"), post.id, allow);

			await expect(reshare(alice, post.id)).rejects.toBeInstanceOf(SelfReshareError);
			await expect(reshare(alice, reply.id)).rejects.toBeInstanceOf(PostNotFoundError);
			await reshare(bob, post.id);
			await expect(reshare(bob, post.id)).rejects.toBeInstanceOf(AlreadyResharedError);

			const entry = (await listFeed()).items.find((item) => item.kind === "reshare" && item.post.id === post.id);

			expect(entry).toMatchObject({ kind: "reshare", resharedBy: { displayName: "Bob Resharer" }, post: { author: { displayName: "Alice Author" }, reshareCount: 1 } });
			expect(await listOwnReshares(bob)).toEqual([post.id]);

			await unreshare(bob, post.id);
			await expect(unreshare(bob, post.id)).rejects.toBeInstanceOf(PostNotFoundError);
			expect((await wholeFeed()).some((item) => item.key === entry!.key)).toBe(false);
			await reshare(bob, post.id);
			expect((await wholeFeed()).find((item) => item.kind === "reshare" && item.post.id === post.id)?.key).toBe(entry!.key);
		});

		it("concurrent duplicate reshares make exactly one", async () => {
			const [alice, bob] = [await newMember(), await newMember()];
			const { note: post } = await writeNote(alice, note("race"), null, allow);
			const results = await Promise.allSettled(Array.from({ length: 5 }, () => reshare(bob, post.id)));

			expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
			const { rows } = await getDb().execute<{ n: number }>(sql`select count(*)::int as n from reshares where post_id = ${post.id}`);

			expect(rows[0].n).toBe(1);
		});

		it("a reshare of a Post torn up since shows it torn up; its thread stays readable", async () => {
			const [alice, bob] = [await newMember(), await newMember()];
			const { note: post } = await writeNote(alice, note("soon gone"), null, allow);
			const { note: reply } = await writeNote(bob, note("still here"), post.id, allow);

			await reshare(bob, post.id);
			await deletePost(alice, post.id);

			const feed = await wholeFeed();

			expect(feed.some((item) => item.kind === "post" && item.post.id === post.id)).toBe(false);
			expect(feed.find((item) => item.kind === "reshare" && item.post.id === post.id)?.post).toEqual({ id: post.id, tornUp: true });
			const thread = await getThread(reply.id);

			expect(thread?.root).toMatchObject({ id: post.id, tornUp: true, content: "" });
			expect(thread?.replies[0]).toMatchObject({ id: reply.id, tornUp: false });
		});
	});

	describe("authorization and limits", () => {
		it("a Member cannot tear up, check or unreshare someone else's content", async () => {
			const [alice, bob] = [await newMember(), await newMember()];
			const { note: post } = await writeNote(alice, note("mine"), null, allow);

			await reshare(bob, post.id);
			await expect(deletePost(bob, post.id)).rejects.toBeInstanceOf(PostNotFoundError);
			await expect(unreshare(alice, post.id)).rejects.toBeInstanceOf(PostNotFoundError);
			expect((await listFeed()).items.some((item) => item.kind === "post" && item.post.id === post.id)).toBe(true);
		});

		it.each(["post", "reply"] as const)("the %s limit refuses the next one with a wait, even sent at once", async (kind) => {
			const alice = await newMember();
			const { note: root } = await writeNote(await newMember(), note("root"), null, allow);
			const { count } = LIMITS[kind];
			const results = await Promise.allSettled(Array.from({ length: count + 2 }, (_, index) => writeNote(alice, note(`${kind} ${index}`), kind === "reply" ? root.id : null, allow)));
			const refused = results.filter((result) => result.status === "rejected").map((result) => (result as PromiseRejectedResult).reason);

			expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(count);
			expect(refused).toHaveLength(2);
			expect(refused[0]).toBeInstanceOf(PostingLimitError);
			expect((refused[0] as PostingLimitError).retryAfter).toBeGreaterThan(0);
		});
	});

	describe("the feed", () => {
		it("pages deterministically: newest first, nothing twice or skipped, stable while notes arrive, one query per page", async () => {
			const alice = await newMember();

			// 45 public Posts, many sharing one timestamp: ties are broken by id.
			await getDb().execute(sql`
				insert into posts (member_id, content, status, published_at)
				select ${alice}, '<p>paged ' || n || '</p>', 'approved', timestamp '2000-01-01' + (n / 3) * interval '1 second'
				from generate_series(1, 45) as n`);

			let queries = 0;
			const counting = {
				execute: ((query: Parameters<ReturnType<typeof getDb>["execute"]>[0]) => {
					queries++;

					return getDb().execute(query);
				}) as ReturnType<typeof getDb>["execute"],
			};
			const seen: string[] = [];
			let cursor: string | null = null;
			let pages = 0;

			do {
				const page = await listFeed(cursor, 20, counting);

				pages++;
				seen.push(...page.items.map((item) => item.key));
				// A new note arriving mid-way lands on page one, never shifting later pages.
				if (pages === 1) await writeNote(await newMember(), note("late arrival"), null, allow);
				cursor = page.nextCursor;
			} while (cursor);

			expect(queries).toBe(pages);
			expect(new Set(seen).size).toBe(seen.length);
			const ours = (await getDb().execute<{ id: string }>(sql`select id from posts where member_id = ${alice} and content like '<p>paged%'`)).rows.map((row) => row.id);

			expect(ours.every((id) => seen.includes(id))).toBe(true);
			expect(pages).toBeGreaterThanOrEqual(3);
		});

		it("the sitemap lists only real public Posts: no seed, demo, replies or held notes", async () => {
			const alice = await newMember();
			const long = (text: string) => note(`${text} ${"a real thought, long enough to index. ".repeat(4)}`);
			const { note: real } = await writeNote(alice, long("real"), null, allow);
			const { note: held } = await writeNote(alice, long("held"), null, refuse());
			const { rows } = await getDb().execute<{ id: string }>(sql`
				insert into posts (member_id, content, status, published_at, is_seed) values (${alice}, ${long("seed")}, 'approved', now(), true) returning id`);
			const ids = (await listSitemapPosts()).map((post) => post.id);

			expect(ids).toContain(real.id);
			expect(ids).not.toContain(held.id);
			expect(ids).not.toContain(rows[0].id);
			expect((await getThread(real.id))?.indexable).toBe(true);
		});

		it("a short Post is out of the sitemap and not indexable until someone replies", async () => {
			const alice = await newMember();
			const { note: short } = await writeNote(alice, note("so good"), null, allow);

			expect((await listSitemapPosts()).map((post) => post.id)).not.toContain(short.id);
			expect((await getThread(short.id))?.indexable).toBe(false);

			await writeNote(await newMember(), note("agreed"), short.id, allow);
			expect((await listSitemapPosts()).map((post) => post.id)).toContain(short.id);
			expect((await getThread(short.id))?.indexable).toBe(true);
		});
	});
});
