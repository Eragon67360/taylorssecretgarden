import { NextResponse } from "next/server";

import { memberWrite } from "@/lib/member-write";
import { errorResponse } from "@/lib/swiftter-responses";
import { appealNote } from "@/service/swiftter";

type Context = { params: Promise<{ id: string }> };

/**
 * "Ask a human to look again" at one of your own refused notes: 201, or 200
 * when you had already asked. 404 when it is not your refused note. The owner
 * hears of it at the next hourly run (app/api/cron/moderation).
 */
export function POST(request: Request, { params }: Context) {
  return memberWrite(
    request,
    async (writer) => {
      try {
        const { created } = await appealNote(writer.id, (await params).id);

        return NextResponse.json({ appealed: true, alreadyAppealed: !created }, { status: created ? 201 : 200 });
      } catch (error) {
        return errorResponse(error, "Asking for a human to look again");
      }
    },
    { body: false },
  );
}
