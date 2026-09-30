import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/db/client";
import { LIMITS, MAX_MODERATION_ATTEMPTS, NO_AUTHOR } from "@/lib/swiftter";
import {
	AlreadyResharedError,
	checkAgain,
	deleteMemberAccount,
	deletePost,
	exportMemberData,
	getThread,
	listFeed,
	listHeld,
	listOwnReshares,
	listSitemapPosts,
	NoMoreChecksError,
	PostingLimitError,
	PostNotFoundError,
	purgeExpired,
	recheckPending,
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

	describe("the scheduled re-check", () => {
		/** Moves a note and its moderation attempts back in time, as if written that long ago. */
		const age = async (postId: string, interval: string) => {
			await getDb().execute(sql`update posts set created_at = created_at - ${interval}::interval where id = ${postId}`);
			await getDb().execute(sql`update moderation_decisions set created_at = created_at - ${interval}::interval where post_id = ${postId}`);
		};

		/** A pending note with every "check again" used up: MAX_MODERATION_ATTEMPTS attempts, none with a verdict. */
		async function stuckNote() {
			const alice = await newMember();
			const { note: held } = await writeNote(alice, note("written during an outage"), null, unavailable);

			for (let attempt = 2; attempt <= MAX_MODERATION_ATTEMPTS; attempt++) await checkAgain(alice, held.id, unavailable);

			return { alice, id: held.id };
		}

		it("a note with 4 attempts and no verdict is retried later, and can still be approved", async () => {
			const { alice, id } = await stuckNote();

			// Just checked: not due yet.
			expect(await recheckPending({ ids: [id], moderate: allow })).toMatchObject({ checked: 0 });
			await age(id, "2 hours");
			expect(await recheckPending({ ids: [id], moderate: allow })).toMatchObject({ checked: 1, approved: 1, gaveUp: 0 });
			expect((await listFeed()).items.some((item) => item.post.id === id)).toBe(true);
			expect(await listHeld(alice)).toEqual([]);
		});

		it("after its first day a note is checked daily, not hourly", async () => {
			const { id } = await stuckNote();

			await age(id, "2 days");
			expect(await recheckPending({ ids: [id], moderate: unavailable })).toMatchObject({ checked: 1, stillPending: 1 });
			await getDb().execute(sql`update moderation_decisions set created_at = now() - interval '3 hours' where post_id = ${id}`);
			expect(await recheckPending({ ids: [id], moderate: allow })).toMatchObject({ checked: 0 });
			await getDb().execute(sql`update moderation_decisions set created_at = now() - interval '1 day' where post_id = ${id}`);
			expect(await recheckPending({ ids: [id], moderate: allow })).toMatchObject({ checked: 1, approved: 1 });
		});

		it("after a week, one last check; without a verdict the note is given up on, reported once, and its author told", async () => {
			const { alice, id } = await stuckNote();

			await age(id, "8 days");
			expect(await recheckPending({ ids: [id], moderate: unavailable })).toMatchObject({ checked: 1, gaveUp: 1 });
			expect(await recheckPending({ ids: [id], moderate: allow })).toMatchObject({ checked: 0, gaveUp: 0 });
			expect(await listHeld(alice)).toEqual([expect.objectContaining({ id, status: "pending", givenUp: true, canCheckAgain: false })]);
		});

		it("a run stops after three notes in a row get no verdict: the Gateway is down", async () => {
			const notes = await Promise.all(Array.from({ length: 5 }, () => stuckNote()));

			for (const { id } of notes) await age(id, "2 hours");
			expect(await recheckPending({ ids: notes.map(({ id }) => id), moderate: unavailable })).toMatchObject({ checked: 3, stillPending: 3 });
		});
	});

	describe("a Member's own data", () => {
		it("the export holds their notes in every state, reshares and moderation decisions, and nobody else's", async () => {
			const [alice, bob] = [await newMember("Alice Exporting"), await newMember()];
			const { note: post } = await writeNote(alice, note("exported post"), null, allow);
			const { note: refused } = await writeNote(alice, note("exported refusal"), null, refuse());
			const { note: theirs } = await writeNote(bob, note("bob's post"), null, allow);
			const { note: reply } = await writeNote(alice, note("exported reply"), theirs.id, allow);

			await reshare(alice, theirs.id);
			const data = await exportMemberData(alice);

			expect(data.member).toMatchObject({ id: alice, displayName: "Alice Exporting" });
			expect(data.notes.map((entry) => [entry.id, entry.kind, entry.status])).toEqual([
				[post.id, "post", "approved"],
				[refused.id, "post", "blocked"],
				[reply.id, "reply", "approved"],
			]);
			expect(data.reshares).toEqual([expect.objectContaining({ postId: theirs.id, undoneAt: null })]);
			expect(data.moderationDecisions.map((decision) => decision.postId).sort()).toEqual([post.id, refused.id, reply.id].sort());
			expect(JSON.stringify(data)).not.toContain("bob's post");
		});

		it("deleting an account tears up every note, drops the reshares, empties the Member row; threads still read", async () => {
			const [alice, bob] = [await newMember("Alice Leaving"), await newMember()];
			const { note: post } = await writeNote(alice, note("leaving soon"), null, allow);
			const { note: held } = await writeNote(alice, note("pending when leaving"), null, unavailable);
			const { note: theirs } = await writeNote(bob, note("bob stays"), null, allow);
			const { note: answer } = await writeNote(bob, note("an answer that stays"), post.id, allow);

			await reshare(alice, theirs.id);
			await deleteMemberAccount(alice);

			const thread = await getThread(answer.id);

			expect(thread?.root).toMatchObject({ id: post.id, tornUp: true, content: "", author: NO_AUTHOR });
			expect(thread?.replies[0]).toMatchObject({ id: answer.id, tornUp: false });
			expect(await listHeld(alice)).toEqual([]);
			expect(await listOwnReshares(alice)).toEqual([]);
			const { rows } = await getDb().execute<{ display_name: string; held: number }>(sql`
				select display_name, (select count(*)::int from posts where id = ${held.id} and deleted_at is null) as held from members where id = ${alice}`);

			expect(rows[0]).toEqual({ display_name: "", held: 0 });
			expect(JSON.stringify(await wholeFeed())).not.toContain("Alice Leaving");
		});
	});

	describe("retention", () => {
		const exists = async (postId: string) =>
			(await getDb().execute<{ n: number }>(sql`select count(*)::int as n from posts where id = ${postId}`)).rows[0].n === 1;
		const backdate = (postId: string, interval: string) =>
			getDb().execute(sql`update posts set created_at = created_at - ${interval}::interval where id = ${postId}`);

		it("removes tombstones nothing refers to, keeps those replies or reshares still show", async () => {
			const [alice, bob] = [await newMember(), await newMember()];
			const { note: lone } = await writeNote(alice, note("lone"), null, allow);
			const { note: answered } = await writeNote(alice, note("answered"), null, allow);
			const { note: undone } = await writeNote(alice, note("reshared, undone"), null, allow);
			const { note: kept } = await writeNote(alice, note("reshared"), null, allow);
			const { note: chainRoot } = await writeNote(alice, note("chain root"), null, allow);
			const { note: chainReply } = await writeNote(alice, note("chain reply"), chainRoot.id, allow);

			await writeNote(bob, note("an answer"), answered.id, allow);
			await reshare(bob, undone.id);
			await unreshare(bob, undone.id);
			await reshare(bob, kept.id);
			for (const { id } of [lone, answered, undone, kept, chainReply, chainRoot]) {
				await deletePost(alice, id);
				await backdate(id, "1 hour");
			}

			await purgeExpired();

			expect(await exists(lone.id)).toBe(false);
			expect(await exists(undone.id)).toBe(false);
			expect(await exists(chainReply.id)).toBe(false);
			expect(await exists(chainRoot.id)).toBe(false);
			expect(await exists(answered.id)).toBe(true);
			expect(await exists(kept.id)).toBe(true);
		});

		it("removes refused notes and notes given up on after 30 days, not sooner, nor anything public", async () => {
			const alice = await newMember();
			const { note: oldRefused } = await writeNote(alice, note("old refused"), null, refuse());
			const { note: newRefused } = await writeNote(alice, note("new refused"), null, refuse());
			const { note: givenUp } = await writeNote(alice, note("given up"), null, unavailable);
			const { note: stillTrying } = await writeNote(alice, note("still pending"), null, unavailable);
			const { note: published } = await writeNote(alice, note("public"), null, allow);

			await backdate(oldRefused.id, "31 days");
			await backdate(published.id, "31 days");
			// Given up: its last check came after its week was over.
			await backdate(givenUp.id, "31 days");
			await backdate(stillTrying.id, "31 days");
			await getDb().execute(sql`update moderation_decisions set created_at = now() - interval '23 days' where post_id = ${givenUp.id}`);
			// Never checked since it was written (the re-check did not run): not given up on, so kept.
			await getDb().execute(sql`update moderation_decisions set created_at = now() - interval '31 days' where post_id = ${stillTrying.id}`);

			await purgeExpired();

			expect(await exists(oldRefused.id)).toBe(false);
			expect(await decisions(oldRefused.id)).toEqual([]);
			expect(await exists(givenUp.id)).toBe(false);
			expect(await exists(newRefused.id)).toBe(true);
			expect(await exists(stillTrying.id)).toBe(true);
			expect(await exists(published.id)).toBe(true);
		});

		it("clears the model's reason on approved decisions after 30 days, keeping the outcome", async () => {
			const alice = await newMember();
			const { note: old } = await writeNote(alice, note("old approved"), null, allow);
			const { note: recent } = await writeNote(alice, note("recent approved"), null, allow);

			await getDb().execute(sql`update moderation_decisions set created_at = now() - interval '31 days' where post_id = ${old.id}`);
			await purgeExpired();

			expect(await decisions(old.id)).toEqual([{ outcome: "approved", category: null, reason: null }]);
			expect(await decisions(recent.id)).toEqual([{ outcome: "approved", category: null, reason: "Test: allowed." }]);
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

		it("a torn-up note in a thread names nobody: no author name, id or avatar", async () => {
			const [alice, bob] = [await newMember("Alice Vanishing"), await newMember("Bob Staying")];

			await getDb().execute(sql`update members set avatar_url = 'https://example.com/alice.png' where id = ${alice}`);
			const { note: post } = await writeNote(alice, note("root to tear up"), null, allow);
			const { note: reply } = await writeNote(alice, note("reply to tear up"), post.id, allow);

			await writeNote(bob, note("still here"), reply.id, allow);
			await deletePost(alice, post.id);
			await deletePost(alice, reply.id);

			const thread = await getThread(post.id);

			expect(thread?.root.author).toEqual(NO_AUTHOR);
			expect(thread?.replies[0]).toMatchObject({ id: reply.id, tornUp: true, author: NO_AUTHOR });
			expect(thread?.replies[1].author.displayName).toBe("Bob Staying");
			// The whole payload, as the page hands it to the browser.
			const payload = JSON.stringify(thread);

			for (const leak of [alice, "Alice Vanishing", "alice.png"]) expect(payload).not.toContain(leak);
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
			const { note: real } = await writeNote(alice, note("real"), null, allow);
			const { note: held } = await writeNote(alice, note("held"), null, refuse());
			const { rows } = await getDb().execute<{ id: string }>(sql`
				insert into posts (member_id, content, status, published_at, is_seed) values (${alice}, '<p>seed</p>', 'approved', now(), true) returning id`);
			const ids = (await listSitemapPosts()).map((post) => post.id);

			expect(ids).toContain(real.id);
			expect(ids).not.toContain(held.id);
			expect(ids).not.toContain(rows[0].id);
		});
	});
});
