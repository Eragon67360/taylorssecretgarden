import { NextResponse } from "next/server";

import { AuthUnavailableError, getSessionUser } from "@/lib/auth/server";
import { errorResponse, NOT_MODERATOR } from "@/lib/swiftter-responses";
import { isModerator, listModerationQueue } from "@/service/moderators";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * The moderation page's list, for moderators only: the notes with open
 * reports or appeals, with their text (held notes' too), authors, reasons and
 * the model's last decision, `{ items, total }`. Never cached. 401 signed
 * out, 403 for anyone who is not a moderator, 503 when Neon Auth fails.
 */
export async function GET() {
  let user;

  try {
    user = await getSessionUser();
  } catch (error) {
    if (error instanceof AuthUnavailableError) return NextResponse.json({ error: "Signing in is unavailable just now." }, { status: 503, headers: PRIVATE });
    throw error;
  }

  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: PRIVATE });

  try {
    if (!(await isModerator(user.id))) return NextResponse.json({ error: NOT_MODERATOR }, { status: 403, headers: PRIVATE });

    return NextResponse.json(await listModerationQueue(user.id), { headers: PRIVATE });
  } catch (error) {
    const response = errorResponse(error, "Reading the moderation list");

    response.headers.set("Cache-Control", PRIVATE["Cache-Control"]);

    return response;
  }
}
