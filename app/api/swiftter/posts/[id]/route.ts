import { NextResponse } from "next/server";

import { memberWrite } from "@/lib/member-write";
import { errorResponse } from "@/lib/swiftter-responses";
import { feedChanged } from "@/service/feed-cache";
import { deletePost } from "@/service/swiftter";

type Context = { params: Promise<{ id: string }> };

/**
 * Tears up one of the signed-in Member's own notes (a Post or a reply, public
 * or held): 204. After memberWrite's checks (403/401/503), 404 when the note
 * is not theirs, whether or not it exists, so a Member cannot probe for other
 * Members' notes.
 */
export function DELETE(request: Request, { params }: Context) {
	return memberWrite(
		request,
		async (writer) => {
			try {
				await deletePost(writer.id, (await params).id);
				feedChanged();

				return new NextResponse(null, { status: 204 });
			} catch (error) {
				return errorResponse(error, "Tearing up your note");
			}
		},
		{ body: false },
	);
}
