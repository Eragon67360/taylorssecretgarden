import { NextResponse } from "next/server";

import { memberWrite } from "@/lib/member-write";
import { errorResponse } from "@/lib/swiftter-responses";
import { feedChanged } from "@/service/feed-cache";
import { ensureMember, memberFromAuthUser, reshare, unreshare } from "@/service/swiftter";

type Context = { params: Promise<{ id: string }> };

/**
 * Reshares someone else's public Post into the feed, credited to its author:
 * 201. 404 when it is not a public Post (a reply cannot be reshared), 422 for
 * your own, 409 when you already reshare it, 429 past the reshare limit.
 */
export function POST(request: Request, { params }: Context) {
  return memberWrite(
    request,
    async (writer) => {
      try {
        // A Member who never wrote has no Member row yet: the reshare needs one.
        await ensureMember(memberFromAuthUser(writer));
        await reshare(writer.id, (await params).id);
        feedChanged();

        return NextResponse.json({ reshared: true }, { status: 201 });
      } catch (error) {
        return errorResponse(error, "Resharing");
      }
    },
    { body: false },
  );
}

/** Undoes your reshare: 204, or 404 when you do not reshare this Post. */
export function DELETE(request: Request, { params }: Context) {
  return memberWrite(
    request,
    async (writer) => {
      try {
        await unreshare(writer.id, (await params).id);
        feedChanged();

        return new NextResponse(null, { status: 204 });
      } catch (error) {
        return errorResponse(error, "Undoing the reshare");
      }
    },
    { body: false },
  );
}
