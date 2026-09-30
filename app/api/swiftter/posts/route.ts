import { NextResponse } from "next/server";

import { memberWrite } from "@/lib/member-write";
import { errorResponse, outcomeResponse } from "@/lib/swiftter-responses";
import { ensureMember, listFeed, memberFromAuthUser, writeNote } from "@/service/swiftter";

/**
 * The Swiftter feed: public, the same for everyone. `?cursor=` pages it
 * (`nextCursor` from the previous page); newest first.
 */
export async function GET(request: Request) {
	try {
		const cursor = new URL(request.url).searchParams.get("cursor");

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

			return outcomeResponse(await writeNote(writer.id, content, parentId));
		} catch (error) {
			return errorResponse(error, "Passing your note");
		}
	});
}
