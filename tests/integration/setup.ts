import type { ModerationResult } from "@/service/moderation";

import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { writeGuard } from "@/db/guard";
import { ensureMember } from "@/service/swiftter";

/*
  Integration tests write to a real Postgres: only a disposable (or
  development) Neon branch, the same guard as the e2e suite. In CI the branch
  exists, so a guard failure there is an error, never a silent skip.
*/
const problem = writeGuard();

if (problem && process.env.CI) throw new Error(`Integration tests need a disposable Neon branch in CI: ${problem}`);

/** Why the integration tests are skipped here (locally, without a disposable branch), or null. */
export const skipReason = problem;

/** Members this test file created, removed afterwards (their notes and reshares go with them). */
const created: string[] = [];

/** A fresh Member for a test; ids never collide with Neon Auth ids (UUIDs) or the demo Members. */
export async function newMember(name = "Integration Tester"): Promise<string> {
	const id = `it_${randomUUID()}`;

	created.push(id);
	await ensureMember({ id, displayName: name, username: null, avatarUrl: null });

	return id;
}

/** Removes every Member this file created, in one statement so their cross-references go together. */
export async function removeMembers() {
	if (!created.length) return;
	await getDb().execute(sql`delete from members where id in (${sql.join(
		created.map((id) => sql`${id}`),
		sql`, `,
	)})`);
	created.length = 0;
}

/** Moderation stand-ins: a verdict, or no verdict at all. */
export const allow = async (): Promise<ModerationResult> => ({ verdict: "allowed", reason: "Test: allowed." });
export const refuse =
	(category: "insult" | "off_topic" = "insult") =>
	async (): Promise<ModerationResult> => ({ verdict: "rejected", category, reason: `Test: ${category}.` });
export const unavailable = async (): Promise<ModerationResult> => {
	throw new Error("Test: the Gateway is down");
};
