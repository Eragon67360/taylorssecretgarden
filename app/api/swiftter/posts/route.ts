import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { ensureMember, InvalidPostError, listFeed, memberFromClerkUser, publishPost } from "@/service/swiftter";

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

/** Publishes a Post as the signed-in Member. Body: `{ content: string }` (HTML). */
export async function POST(request: Request) {
	const { userId } = await auth();

	if (!userId) return NextResponse.json({ error: "Sign in to publish a Post." }, { status: 401 });

	const body = (await request.json().catch(() => null)) as { content?: unknown } | null;

	if (typeof body?.content !== "string") {
		return NextResponse.json({ error: "Expected a JSON body with a `content` string." }, { status: 400 });
	}

	const user = await currentUser();

	if (!user) return NextResponse.json({ error: "Sign in to publish a Post." }, { status: 401 });

	try {
		await ensureMember(memberFromClerkUser(user));
		const post = await publishPost(user.id, body.content);

		return NextResponse.json({ post }, { status: 201 });
	} catch (error) {
		if (error instanceof InvalidPostError) return NextResponse.json({ error: error.message }, { status: 400 });

		// eslint-disable-next-line no-console
		console.error("Publishing a Post failed", error);

		return NextResponse.json({ error: "The Post could not be published right now." }, { status: 500 });
	}
}
