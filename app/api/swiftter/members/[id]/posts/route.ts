import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/swiftter-responses";
import { getMemberProfile, listMemberPosts } from "@/service/members";

type Context = { params: Promise<{ id: string }> };

/**
 * A Member's public Posts, a page at a time (`?cursor=`, the previous page's
 * `nextCursor`), newest first: their page's "older notes"
 * (app/swiftter/m/[id]). Public, like the feed; 404 when the Member has no
 * page (no such Member, or a deleted account).
 */
export async function GET(request: Request, { params }: Context) {
	try {
		const { id } = await params;

		if (!(await getMemberProfile(id))) return NextResponse.json({ error: "There is no such Member." }, { status: 404 });

		return NextResponse.json(await listMemberPosts(id, new URL(request.url).searchParams.get("cursor")));
	} catch (error) {
		return errorResponse(error, "Reading this Member's notes");
	}
}
