import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/server";
import { isBot } from "@/lib/bot-protection";
import { BOT_REFUSAL } from "@/lib/botid-routes";
import {
	ensureMember,
	InvalidPostError,
	listFeed,
	memberFromAuthUser,
	POSTING_LIMIT,
	PostingLimitError,
	postingLimitWait,
	publishPost,
} from "@/service/swiftter";

/** The Swiftter feed: public, newest Posts first. */
export async function GET() {
	try {
		return NextResponse.json({ posts: await listFeed() });
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Swiftter feed failed", error);

		return NextResponse.json({ error: "The feed is unavailable right now." }, { status: 500 });
	}
}

/** 429, saying when the next Post is allowed. */
function limitReached(retryAfter: number) {
	const minutes = Math.ceil(retryAfter / 60);
	const when = minutes <= 1 ? "in a minute" : `in ${minutes} minutes`;

	return NextResponse.json(
		{
			error: `That's ${POSTING_LIMIT.posts} notes in ${POSTING_LIMIT.minutes} minutes: let the ink dry a little. You can pass the next one ${when}.`,
			retryAfter,
		},
		{ status: 429, headers: { "Retry-After": String(retryAfter) } },
	);
}

/**
 * Publishes a Post as the signed-in Member. Body: `{ content: string }` (HTML).
 *
 * In order: the session (401), BotID (403, lib/bot-protection.ts), the
 * posting limit (429, with Retry-After), then the content itself (400).
 */
export async function POST(request: Request) {
	const user = await getSessionUser();

	if (!user) return NextResponse.json({ error: "Sign in to publish a Post." }, { status: 401 });

	// This route is in lib/botid-routes.ts, so the browser sends BotID's token with it.
	if (await isBot(request)) return NextResponse.json({ error: BOT_REFUSAL }, { status: 403 });

	try {
		const wait = await postingLimitWait(user.id);

		if (wait !== null) return limitReached(wait);

		const body = (await request.json().catch(() => null)) as { content?: unknown } | null;

		if (typeof body?.content !== "string") {
			return NextResponse.json({ error: "Expected a JSON body with a `content` string." }, { status: 400 });
		}

		await ensureMember(memberFromAuthUser(user));
		const post = await publishPost(user.id, body.content);

		return NextResponse.json({ post }, { status: 201 });
	} catch (error) {
		if (error instanceof InvalidPostError) return NextResponse.json({ error: error.message }, { status: 400 });
		if (error instanceof PostingLimitError) return limitReached(error.retryAfter);

		// eslint-disable-next-line no-console
		console.error("Publishing a Post failed", error);

		return NextResponse.json({ error: "The Post could not be published right now." }, { status: 500 });
	}
}
