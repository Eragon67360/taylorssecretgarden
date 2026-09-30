import { NextResponse } from "next/server";

import { memberWrite } from "@/lib/member-write";
import { errorResponse, outcomeResponse } from "@/lib/swiftter-responses";
import { feedChanged, getFirstFeedPage } from "@/service/feed-cache";
import { ensureMember, listFeed, memberFromAuthUser, writeNote } from "@/service/swiftter";

/**
 * The first page may be kept by the CDN for a little while. It is the same
 * for everyone: this route never reads the session, and a Member's own view
 * (held notes, their reshares) is only ever served by /api/swiftter/me.
 */
const PUBLIC_FIRST_PAGE = { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" };

/**
 * The Swiftter feed: public, the same for everyone. `?cursor=` pages it
 * (`nextCursor` from the previous page); newest first. The first page comes
 * from the data cache (service/feed-cache.ts), invalidated on every change.
 */
export async function GET(request: Request) {
	try {
		const cursor = new URL(request.url).searchParams.get("cursor");

		if (!cursor) return NextResponse.json(await getFirstFeedPage(), { headers: PUBLIC_FIRST_PAGE });

		return NextResponse.json(await listFeed(cursor));
	} catch (error) {
		return errorResponse(error, "Reading the feed");
	}
}

/**
 * Writes a note as the signed-in Member. Body: `{ content: string, parentId?:
 * string }` (HTML; with `parentId`, a reply to that public note).
 *
 * memberWrite checks origin, JSON, session (401/503) and BotID (403) first;
 * then the write limit (429, with Retry-After) and the content (400). The note
 * is stored before AI moderation judges it, so the answer is one of: 201
 * approved and public; 422 refused (kept, visible to its author only, with
 * the reason); 202 no verdict (kept, pending, checked again later). A reply
 * to a note that is not public is 404.
 */
export function POST(request: Request) {
	return memberWrite(request, async (writer, body) => {
		const { content, parentId } = body;

		if (typeof content !== "string" || (parentId !== undefined && parentId !== null && typeof parentId !== "string")) {
			return NextResponse.json({ error: "Expected a JSON body with a `content` string (and an optional `parentId`)." }, { status: 400 });
		}

		try {
			await ensureMember(memberFromAuthUser(writer));
			const outcome = await writeNote(writer.id, content, parentId);

			// A new Post, or a reply (its thread's count), is public.
			if (outcome.status === "approved") feedChanged();

			return outcomeResponse(outcome);
		} catch (error) {
			return errorResponse(error, "Passing your note");
		}
	});
}
