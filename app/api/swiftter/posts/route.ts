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
	preparePost,
	publishPost,
} from "@/service/swiftter";
import { type ModerationCategory, moderatePost, ModerationUnavailableError } from "@/service/moderation";
import { postPlainText } from "@/service/post-html";

/** Why a Post was refused by moderation, in the journal's voice. */
const REFUSALS: Record<ModerationCategory, string> = {
	insult: "This note reads as unkind, so it wasn't passed. Swiftter is a gentle corner of the fandom: soften it and try again.",
	off_topic:
		"This note wanders away from Taylor, so it wasn't passed. Swiftter is for her music, the Eras, the tours and fan life: bring it back to Taylor and try again.",
};

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
 * posting limit (429, with Retry-After), the content itself (400), then AI
 * moderation of its text (422 `{ category, message }` if refused, 503 if it
 * gave no verdict). Nothing is stored unless every check passes.
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

		const content = preparePost(body.content);
		const moderation = await moderatePost(postPlainText(content));

		if (moderation.verdict === "rejected") {
			return NextResponse.json({ category: moderation.category, message: REFUSALS[moderation.category] }, { status: 422 });
		}

		await ensureMember(memberFromAuthUser(user));
		const post = await publishPost(user.id, content);

		return NextResponse.json({ post }, { status: 201 });
	} catch (error) {
		if (error instanceof InvalidPostError) return NextResponse.json({ error: error.message }, { status: 400 });
		if (error instanceof PostingLimitError) return limitReached(error.retryAfter);
		if (error instanceof ModerationUnavailableError) {
			// eslint-disable-next-line no-console
			console.error("Moderation failed", error.cause ?? error);

			return NextResponse.json(
				{ error: "Your note couldn't be checked just now, so it wasn't passed. Try again in a moment." },
				{ status: 503 },
			);
		}

		// eslint-disable-next-line no-console
		console.error("Publishing a Post failed", error);

		return NextResponse.json({ error: "The Post could not be published right now." }, { status: 500 });
	}
}
