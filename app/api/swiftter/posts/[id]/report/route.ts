import { NextResponse } from "next/server";

import { memberWrite } from "@/lib/member-write";
import { errorResponse } from "@/lib/swiftter-responses";
import { ensureMember, memberFromAuthUser, reportNote } from "@/service/swiftter";

type Context = { params: Promise<{ id: string }> };

/**
 * Reports someone else's public note (a Post or a reply) for a human to look
 * at, `{ reason? }` (plain text, at most 500 characters): 201, or 200 when
 * you had already reported it. 404 when it is not a public note, 422 for your
 * own, 400 for a reason that cannot be kept, 429 past the report limit. The
 * owner hears of it at the next hourly run (app/api/cron/moderation).
 */
export function POST(request: Request, { params }: Context) {
  return memberWrite(request, async (writer, body) => {
    try {
      // A Member who never wrote has no Member row yet: the report needs one.
      await ensureMember(memberFromAuthUser(writer));
      const { created } = await reportNote(writer.id, (await params).id, body.reason);

      return NextResponse.json({ reported: true, alreadyReported: !created }, { status: created ? 201 : 200 });
    } catch (error) {
      return errorResponse(error, "Reporting the note");
    }
  });
}
