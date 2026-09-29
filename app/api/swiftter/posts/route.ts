import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/server";
import { isBot } from "@/lib/bot-protection";
import { ensureMember, InvalidPostError, listFeed, memberFromAuthUser, nextPostAllowedAt, POSTING_LIMIT, publishPost } from "@/service/swiftter";

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

/** "in a minute", "in 7 minutes". */
const inMinutes = (seconds: number) => {
	const minutes = Math.ceil(seconds / 60);

	return minutes <= 1 ? "in a minute" : `in ${minutes} minutes`;
};

/**
 * Publishes a Post as the signed-in Member. Body: `{ content: string }` (HTML).
 *
 * In order: the session (401), BotID (403), the posting limit (429, with
 * Retry-After), then the content itself (400).
 */
export async function POST(request: Request) {
	const user = await getSessionUser();

	if (!user) return NextResponse.json({ error: "Sign in to publish a Post." }, { status: 401 });

	if (await isBot(request)) {
		return NextResponse.json({ error: "This browser couldn't be checked just now. Reload the page and try again." }, { status: 403 });
	}

	const body = (await request.json().catch(() => null)) as { content?: unknown } | null;

	if (typeof body?.content !== "string") {
		return NextResponse.json({ error: "Expected a JSON body with a `content` string." }, { status: 400 });
	}

	try {
		const allowedAt = await nextPostAllowedAt(user.id);

		if (allowedAt) {
			const retryAfter = Math.max(1, Math.ceil((allowedAt.getTime() - Date.now()) / 1000));

			return NextResponse.json(
				{
					error: `That's ${POSTING_LIMIT.posts} notes in ${POSTING_LIMIT.minutes} minutes: let the ink dry a little. You can pass the next one ${inMinutes(retryAfter)}.`,
					retryAfter,
				},
				{ status: 429, headers: { "Retry-After": String(retryAfter) } },
			);
		}

		await ensureMember(memberFromAuthUser(user));
		const post = await publishPost(user.id, body.content);

		return NextResponse.json({ post }, { status: 201 });
	} catch (error) {
		if (error instanceof InvalidPostError) return NextResponse.json({ error: error.message }, { status: 400 });

		// eslint-disable-next-line no-console
		console.error("Publishing a Post failed", error);

		return NextResponse.json({ error: "The Post could not be published right now." }, { status: 500 });
	}
}
