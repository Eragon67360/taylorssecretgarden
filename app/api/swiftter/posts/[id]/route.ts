import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/server";
import { deletePost, PostNotFoundError } from "@/service/swiftter";

/**
 * Deletes one of the signed-in Member's own Posts: 204. 401 when signed out;
 * 404 when the Post is not theirs, whether or not it exists, so a Member cannot
 * probe for other Members' Posts. No BotID check: it only ever removes the
 * Member's own writing, and costs nothing.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const user = await getSessionUser();

	if (!user) return NextResponse.json({ error: "Sign in to delete your Posts." }, { status: 401 });

	const { id } = await params;

	try {
		await deletePost(user.id, id);

		return new NextResponse(null, { status: 204 });
	} catch (error) {
		if (error instanceof PostNotFoundError) return NextResponse.json({ error: "There is no such Post of yours." }, { status: 404 });

		// eslint-disable-next-line no-console
		console.error("Deleting a Post failed", error);

		return NextResponse.json({ error: "The Post could not be deleted right now." }, { status: 500 });
	}
}
