import { NextResponse } from "next/server";

import { memberWrite } from "@/lib/member-write";
import { MODERATION_ACTIONS, type ModerationAction } from "@/lib/swiftter";
import { errorResponse, NOT_MODERATOR } from "@/lib/swiftter-responses";
import { feedChanged } from "@/service/feed-cache";
import { decide, isModerator } from "@/service/moderators";

type Context = { params: Promise<{ id: string }> };

const isAction = (value: unknown): value is ModerationAction => MODERATION_ACTIONS.includes(value as ModerationAction);

/**
 * A moderator's decision on a note people asked a human about,
 * `{ action: "tear-up" | "keep" | "publish", note? }` (`note`: their own
 * words for the record, plain text, at most 500 characters): 204. After
 * memberWrite's checks (403/415/401/503), 403 for anyone who is not a
 * moderator; then 400 for an unknown action or a note that cannot be kept,
 * 404 for no such note, 409 when nothing about it is open any more (another
 * moderator decided first) or for publishing a note that was not refused.
 */
export function POST(request: Request, { params }: Context) {
  // memberWrite's default `verifiedEmail: true`, on purpose: a moderator acts on other Members' notes, so their address must be confirmed
  // when REQUIRE_EMAIL_VERIFICATION is on (unlike tearing up one's own note or deleting one's account).
  return memberWrite(request, async (writer, body) => {
    try {
      if (!(await isModerator(writer.id))) return NextResponse.json({ error: NOT_MODERATOR }, { status: 403 });
      if (!isAction(body.action)) return NextResponse.json({ error: `The action is one of ${MODERATION_ACTIONS.join(", ")}.` }, { status: 400 });

      await decide(writer.id, (await params).id, body.action, body.note);
      // Torn up or published: the feed's cached first page may show it, or should.
      feedChanged();

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return errorResponse(error, "Recording the decision");
    }
  });
}
