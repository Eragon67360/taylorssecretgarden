import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/db/client";
import { moderators } from "@/db/schema";
import { AlreadyHandledError, decide, isModerator, listModerationQueue, NotModeratorError, NotRefusedError } from "@/service/moderators";
import {
  appealNote,
  deleteMemberAccount,
  exportMemberData,
  getThread,
  InvalidReasonError,
  listFeed,
  listHeld,
  PostNotFoundError,
  purgeExpired,
  reportNote,
  writeNote,
} from "@/service/swiftter";

import { allow, newMember, refuse, removeMembers, skipReason } from "./setup";

const note = (text: string) => `<p>${text}</p>`;

/** The model's decisions, whichever model the tests' environment names (the fake's or the real one's). */
const theModel = expect.not.stringMatching(/^human/);

/** Makes the Member a moderator, as `npm run moderator -- grant` does. */
async function moderator() {
  const id = await newMember("Moderator");

  await getDb().insert(moderators).values({ memberId: id });

  return id;
}

const decisions = async (postId: string) =>
  (
    await getDb().execute<{ outcome: string; category: string | null; reason: string | null; model: string }>(sql`
			select outcome, category, reason, model from moderation_decisions where post_id = ${postId} order by created_at`)
  ).rows;

const openReports = async (postId: string) =>
  (await getDb().execute<{ n: number }>(sql`select count(*)::int as n from note_reports where post_id = ${postId} and resolved_at is null`)).rows[0].n;

const inFeed = async (postId: string) => (await listFeed()).items.some((item) => item.kind === "post" && item.post.id === postId);

/** The queue's entry for a note, if it is in it. */
const queued = async (moderatorId: string, postId: string) => (await listModerationQueue(moderatorId, 10_000)).items.find((item) => item.id === postId);

describe.skipIf(!!skipReason)("Moderators against Postgres", () => {
  afterAll(removeMembers);

  describe("the role", () => {
    it("only moderators are moderators; anyone else is refused the list and every decision, which changes nothing", async () => {
      const [alice, bob, mod] = [await newMember(), await newMember(), await moderator()];
      const { note: post } = await writeNote(alice, note("reported, untouched"), null, allow);

      await reportNote(bob, post.id, "mean");
      expect(await isModerator(mod)).toBe(true);
      expect(await isModerator(bob)).toBe(false);
      await expect(listModerationQueue(bob)).rejects.toBeInstanceOf(NotModeratorError);
      for (const action of ["tear-up", "keep", "publish"] as const) await expect(decide(bob, post.id, action)).rejects.toBeInstanceOf(NotModeratorError);

      expect(await openReports(post.id)).toBe(1);
      expect(await decisions(post.id)).toHaveLength(1);
      expect(await inFeed(post.id)).toBe(true);
    });

    it("a revoked moderator decides nothing; deleting a moderator's account takes the role with it", async () => {
      const [alice, bob, mod] = [await newMember(), await newMember(), await moderator()];
      const { note: post } = await writeNote(alice, note("reported to a former moderator"), null, allow);

      await reportNote(bob, post.id);
      await getDb().execute(sql`delete from moderators where member_id = ${mod}`);
      await expect(decide(mod, post.id, "keep")).rejects.toBeInstanceOf(NotModeratorError);

      const other = await moderator();

      await deleteMemberAccount(other);
      expect(await isModerator(other)).toBe(false);
    });
  });

  describe("the list", () => {
    it("shows each note with open reports or an appeal once: text (a held note's too), author, reasons, the model's decision, its thread", async () => {
      const [alice, bob, carol, mod] = [await newMember("Alice"), await newMember(), await newMember(), await moderator()];
      const { note: post } = await writeNote(alice, note("reported twice"), null, allow);
      const { note: reply } = await writeNote(alice, note("refused reply"), post.id, refuse("off_topic"));
      const { note: quiet } = await writeNote(alice, note("never reported"), null, allow);

      await reportNote(bob, post.id, "line one\nline two");
      await reportNote(carol, post.id);
      await appealNote(alice, reply.id);

      expect(await queued(mod, post.id)).toEqual({
        id: post.id,
        content: "<p>reported twice</p>",
        status: "approved",
        isReply: false,
        threadPath: `/swiftter/p/${post.id}`,
        createdAt: expect.any(String),
        author: { id: alice, displayName: "Alice" },
        reports: [
          { kind: "report", reason: null, createdAt: expect.any(String) },
          { kind: "report", reason: "line one\nline two", createdAt: expect.any(String) },
        ],
        aiDecision: { outcome: "approved", category: null, reason: "Test: allowed.", createdAt: expect.any(String) },
      });
      expect(await queued(mod, reply.id)).toMatchObject({
        content: "<p>refused reply</p>",
        status: "blocked",
        isReply: true,
        // A held reply is read in its public thread.
        threadPath: `/swiftter/p/${post.id}`,
        reports: [{ kind: "appeal", reason: null }],
        aiDecision: { outcome: "blocked", category: "off_topic", reason: "Test: off_topic." },
      });
      expect(await queued(mod, quiet.id)).toBeUndefined();
    });
  });

  describe("decisions", () => {
    it("tear up: the app's own tear-up (text and earlier reasons erased, gone from the feed), reports settled, the decision recorded", async () => {
      const [alice, bob, mod] = [await newMember(), await newMember(), await moderator()];
      const { note: post } = await writeNote(alice, note("to tear up"), null, allow);

      await reportNote(bob, post.id, "doxxing");
      await decide(mod, post.id, "tear-up", "Shared an address.");

      const { rows } = await getDb().execute<{ content: string; deleted_at: Date | null }>(sql`select content, deleted_at from posts where id = ${post.id}`);

      expect(rows[0]).toEqual({ content: "", deleted_at: expect.anything() });
      expect(await inFeed(post.id)).toBe(false);
      expect((await getThread(post.id))?.root).toMatchObject({ tornUp: true, content: "" });
      expect(await openReports(post.id)).toBe(0);
      expect(await decisions(post.id)).toEqual([
        { outcome: "approved", category: null, reason: null, model: theModel },
        { outcome: "blocked", category: null, reason: "Shared an address.", model: `human:${mod}` },
      ]);
      expect(await queued(mod, post.id)).toBeUndefined();
    });

    it("keep: a public note stays public, a refused one stays refused; reports settled, the decision recorded", async () => {
      const [alice, bob, mod] = [await newMember(), await newMember(), await moderator()];
      const { note: post } = await writeNote(alice, note("to keep"), null, allow);
      const { note: refused } = await writeNote(alice, note("rightly refused"), null, refuse());

      await reportNote(bob, post.id);
      await appealNote(alice, refused.id);
      await decide(mod, post.id, "keep");
      await decide(mod, refused.id, "keep", "The model was right.");

      expect(await inFeed(post.id)).toBe(true);
      expect(await openReports(post.id)).toBe(0);
      expect((await decisions(post.id)).at(-1)).toEqual({ outcome: "approved", category: null, reason: null, model: `human:${mod}` });
      expect(await openReports(refused.id)).toBe(0);
      expect((await decisions(refused.id)).at(-1)).toEqual({ outcome: "blocked", category: null, reason: "The model was right.", model: `human:${mod}` });
      // Its author still reads the model's reason, never the moderator's note, and it stays asked.
      expect(await listHeld(alice)).toContainEqual(
        expect.objectContaining({ id: refused.id, status: "blocked", category: "insult", reason: "Test: insult.", appealed: true }),
      );
    });

    it("publish after all: a refused note is approved and published now, at the top of the feed; only a refused note", async () => {
      const [alice, bob, mod] = [await newMember(), await newMember(), await moderator()];
      const { note: refused } = await writeNote(alice, note("misjudged by the model"), null, refuse("off_topic"));
      const { note: post } = await writeNote(alice, note("already public"), null, allow);

      await appealNote(alice, refused.id);
      await reportNote(bob, post.id);
      await expect(decide(mod, post.id, "publish")).rejects.toBeInstanceOf(NotRefusedError);
      await decide(mod, refused.id, "publish", "Fan chatter, on topic.");

      const { rows } = await getDb().execute<{ status: string; published_at: Date | null }>(
        sql`select status, published_at from posts where id = ${refused.id}`,
      );

      expect(rows[0]).toEqual({ status: "approved", published_at: expect.anything() });
      expect((await listFeed()).items[0]).toMatchObject({ kind: "post", post: { id: refused.id } });
      expect(await listHeld(alice)).not.toContainEqual(expect.objectContaining({ id: refused.id }));
      expect(await openReports(refused.id)).toBe(0);
      expect((await decisions(refused.id)).at(-1)).toEqual({ outcome: "approved", category: null, reason: "Fan chatter, on topic.", model: `human:${mod}` });
      // The refused attempt did not settle the other note's report.
      expect(await openReports(post.id)).toBe(1);
    });

    it("once only: a second decision, or one on a note nobody asked about, is refused; so are a bad note and a bad id", async () => {
      const [alice, bob, mod, other] = [await newMember(), await newMember(), await moderator(), await moderator()];
      const { note: post } = await writeNote(alice, note("decided twice at once"), null, allow);
      const { note: quiet } = await writeNote(alice, note("nobody asked"), null, allow);

      await reportNote(bob, post.id);
      await expect(decide(mod, post.id, "keep", "x".repeat(501))).rejects.toBeInstanceOf(InvalidReasonError);
      const results = await Promise.allSettled([decide(mod, post.id, "tear-up"), decide(other, post.id, "keep")]);

      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(results.find((result) => result.status === "rejected")?.reason).toBeInstanceOf(AlreadyHandledError);
      expect((await decisions(post.id)).filter((decision) => decision.model.startsWith("human:"))).toHaveLength(1);
      await expect(decide(mod, quiet.id, "keep")).rejects.toBeInstanceOf(AlreadyHandledError);
      await expect(decide(mod, "not-a-uuid", "keep")).rejects.toBeInstanceOf(PostNotFoundError);
      await expect(decide(mod, "00000000-0000-4000-8000-000000000000", "keep")).rejects.toBeInstanceOf(PostNotFoundError);
    });

    it("decisions stay: the purge keeps a moderator's note after 30 days, and an export names no moderator", async () => {
      const [alice, bob, mod] = [await newMember(), await newMember(), await moderator()];
      const { note: post } = await writeNote(alice, note("kept long ago"), null, allow);

      await reportNote(bob, post.id);
      await decide(mod, post.id, "keep", "Harmless.");
      // Both past retention, in the order they were made.
      await getDb().execute(sql`
				update moderation_decisions set created_at = now() - case when model like 'human:%' then interval '31 days' else interval '32 days' end
				where post_id = ${post.id}`);
      await purgeExpired();

      expect(await decisions(post.id)).toEqual([
        { outcome: "approved", category: null, reason: null, model: theModel },
        { outcome: "approved", category: null, reason: "Harmless.", model: `human:${mod}` },
      ]);
      const exported = await exportMemberData(alice);

      expect(exported.moderationDecisions.map((decision) => decision.model)).toEqual([theModel, "human"]);
      expect(JSON.stringify(exported)).not.toContain(mod);
    });
  });
});
