import "server-only";

import { NextResponse } from "next/server";

import { LIMITS, type LimitedWrite, type RefusalCategory } from "@/lib/swiftter";
import {
	AlreadyResharedError,
	InvalidCursorError,
	InvalidPostError,
	NoMoreChecksError,
	PostingLimitError,
	PostNotFoundError,
	SelfReshareError,
	type WriteOutcome,
} from "@/service/swiftter";

/*
  How Swiftter's routes answer, in the journal's voice: one place for the
  status codes and messages, so every route says the same thing.
*/

/** Why a note was refused by moderation. */
export const REFUSALS: Record<RefusalCategory, string> = {
	insult: "This note reads as unkind, so it wasn't passed. Swiftter is a gentle corner of the fandom: soften it and try again.",
	restricted:
		"This note shares something Swiftter can't keep: someone's personal details, a risky or unofficial ticket link, adult or illegal content, or a song's full lyrics. Take that part out and try again.",
	off_topic:
		"This note wanders away from Taylor, so it wasn't passed. Swiftter is for her music, the Eras, the tours and fan life: bring it back to Taylor and try again.",
};

/** Moderation gave no verdict: the note is kept, waiting. */
export const HELD =
	"Your note is saved, but it couldn't be checked just now, so only you can see it. It will be checked again shortly, or you can press “check again”.";

const WHAT: Record<LimitedWrite, string> = { post: "notes", reply: "replies", reshare: "reshares" };

/** 201 approved (public), 422 refused (kept, author only), 202 no verdict (kept, pending). */
export function outcomeResponse(outcome: WriteOutcome) {
	if (outcome.status === "approved") return NextResponse.json({ status: "approved", note: outcome.note }, { status: 201 });
	if (outcome.status === "blocked") {
		return NextResponse.json({ status: "blocked", category: outcome.category, message: REFUSALS[outcome.category], note: outcome.note }, { status: 422 });
	}

	return NextResponse.json({ status: "pending", message: HELD, note: outcome.note }, { status: 202 });
}

/** 429, saying when the next write of that kind is allowed. */
export function limitReached({ kind, retryAfter }: PostingLimitError) {
	const { count, minutes } = LIMITS[kind];
	const wait = Math.ceil(retryAfter / 60);
	const when = wait <= 1 ? "in a minute" : `in ${wait} minutes`;

	return NextResponse.json(
		{ error: `That's ${count} ${WHAT[kind]} in ${minutes} minutes: let the ink dry a little. You can pass the next one ${when}.`, retryAfter },
		{ status: 429, headers: { "Retry-After": String(retryAfter) } },
	);
}

/**
 * The answer for an error a Swiftter route threw: the expected ones mapped to
 * their status, anything else logged (never with the note's content) and 500.
 */
export function errorResponse(error: unknown, action: string) {
	if (error instanceof InvalidPostError) return NextResponse.json({ error: error.message }, { status: 400 });
	if (error instanceof InvalidCursorError) return NextResponse.json({ error: "That page of the feed doesn't exist." }, { status: 400 });
	if (error instanceof PostingLimitError) return limitReached(error);
	if (error instanceof PostNotFoundError) return NextResponse.json({ error: "There is no such note." }, { status: 404 });
	if (error instanceof SelfReshareError) return NextResponse.json({ error: error.message }, { status: 422 });
	if (error instanceof AlreadyResharedError) return NextResponse.json({ error: error.message }, { status: 409 });
	if (error instanceof NoMoreChecksError) {
		return NextResponse.json({ error: "This note has been checked as many times as it can be. Tear it up and write it again later." }, { status: 409 });
	}

	// eslint-disable-next-line no-console
	console.error(`${action} failed`, error instanceof Error ? error.message : error);

	return NextResponse.json({ error: `${action} didn't work just now. Try again in a moment.` }, { status: 500 });
}
