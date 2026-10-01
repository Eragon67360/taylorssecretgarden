import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/db/client";
import { countNewReplies, getMemberProfile, listMemberPosts, listOwnNotes } from "@/service/members";
import { deleteMemberAccount, deletePost, writeNote } from "@/service/swiftter";

import { allow, newMember, refuse, removeMembers, skipReason, unavailable } from "./setup";

const note = (text: string) => `<p>${text}</p>`;

/** Writes a public note (or reply) and returns its id. */
async function publish(memberId: string, text: string, parentId?: string) {
  const outcome = await writeNote(memberId, note(text), parentId, allow);

  if (outcome.status !== "approved") throw new Error(`Expected approved, got ${outcome.status}`);

  return outcome.note.id;
}

describe.skipIf(!!skipReason)("Member pages, own notes and new replies against Postgres", () => {
  afterAll(removeMembers);

  it("a Member's page: their public Posts only, newest first, paginated; their replies counted", async () => {
    const author = await newMember("Page Owner");
    const other = await newMember("Other Member");
    const first = await publish(author, "First");
    const second = await publish(author, "Second");
    const third = await publish(author, "Third");
    const torn = await publish(author, "Torn");

    await deletePost(author, torn);
    await writeNote(author, note("Refused"), null, refuse());
    await publish(author, "A reply of theirs", await publish(other, "Someone else's"));

    expect(await getMemberProfile(author)).toMatchObject({ id: author, displayName: "Page Owner", noteCount: 3, replyCount: 1 });

    const page1 = await listMemberPosts(author, null, 2);

    expect(page1.items.map((item) => item.post.id)).toEqual([third, second]);
    expect(page1.nextCursor).not.toBeNull();
    const page2 = await listMemberPosts(author, page1.nextCursor, 2);

    expect(page2.items.map((item) => item.post.id)).toEqual([first]);
    expect(page2.nextCursor).toBeNull();
    expect(JSON.stringify([page1, page2])).not.toMatch(/Refused|Torn/);
  });

  it("no page for an unknown id, nor once the Member deleted their account", async () => {
    const leaving = await newMember("Leaving Soon");

    await publish(leaving, "Goodbye");
    expect(await getMemberProfile("no_such_member")).toBeNull();
    expect(await getMemberProfile("not a valid id!")).toBeNull();
    expect(await getMemberProfile(leaving)).not.toBeNull();

    await deleteMemberAccount(leaving);
    expect(await getMemberProfile(leaving)).toBeNull();
    expect((await listMemberPosts(leaving)).items).toEqual([]);
  });

  it("their own notes: Posts and replies, public only, with their replies counted", async () => {
    const me = await newMember("Me");
    const other = await newMember("Them");
    const mine = await publish(me, "My <b>note</b>");
    const theirs = await publish(other, "Their note");
    const myReply = await publish(me, "My reply", theirs);

    await publish(other, "Answering me", mine);
    await publish(other, "Answering my reply", myReply);
    await writeNote(me, note("Held"), null, unavailable);

    const { notes, total } = await listOwnNotes(me);

    expect(total).toBe(2);
    expect(notes).toEqual([
      expect.objectContaining({ id: myReply, isReply: true, excerpt: "My reply", replyCount: 1 }),
      expect.objectContaining({ id: mine, isReply: false, excerpt: "My note", replyCount: 1 }),
    ]);
  });

  it("new replies: others' public replies straight under the Member's notes since a time, not their own", async () => {
    const me = await newMember("Replied To");
    const other = await newMember("Replier");
    const mine = await publish(me, "Reply to me");
    const { count: none, at } = await countNewReplies(me, null);

    expect(none).toBe(0);

    const answer = await publish(other, "Here you go", mine);

    await publish(me, "My own answer", mine);
    await writeNote(other, note("Not public yet"), mine, unavailable);
    // A reply to the reply is not to my note.
    await publish(other, "Deeper", answer);

    expect((await countNewReplies(me, new Date(at))).count).toBe(1);
    expect((await countNewReplies(me, new Date(Date.now() + 60_000))).count).toBe(0);

    // A torn-up reply no longer counts.
    await deletePost(other, answer);
    expect((await countNewReplies(me, new Date(at))).count).toBe(0);

    // The answer's `at` is the database's time.
    const { rows } = await getDb().execute<{ now: string }>(sql`select now()::text as now`);

    expect(Math.abs(Date.parse(at) - Date.parse(rows[0].now.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00")))).toBeLessThan(60_000);
  });
});
