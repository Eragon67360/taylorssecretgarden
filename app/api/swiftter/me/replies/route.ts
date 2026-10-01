import { NextResponse } from "next/server";

import { AuthUnavailableError, getSessionUser } from "@/lib/auth/server";
import { errorResponse } from "@/lib/swiftter-responses";
import { countNewReplies } from "@/service/members";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * The header's "new replies" badge: how many replies other Members wrote to
 * the signed-in Member's notes since `?since=` (an ISO time: the `at` of an
 * earlier answer, kept by the browser), and `at`, the time to send next.
 * Only a count, never the replies. Without `since`, 0 (counting starts now).
 * Never cached. 400 for a `since` that is not a time, 401 signed out, 503
 * when Neon Auth fails.
 */
export async function GET(request: Request) {
  const sinceParam = new URL(request.url).searchParams.get("since");
  const since = sinceParam === null ? null : new Date(sinceParam);

  if (since && Number.isNaN(since.getTime())) return NextResponse.json({ error: "`since` must be a time (ISO 8601)." }, { status: 400, headers: PRIVATE });

  let user;

  try {
    user = await getSessionUser();
  } catch (error) {
    if (error instanceof AuthUnavailableError) return NextResponse.json({ error: "Signing in is unavailable just now." }, { status: 503, headers: PRIVATE });
    throw error;
  }

  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: PRIVATE });

  try {
    return NextResponse.json(await countNewReplies(user.id, since), { headers: PRIVATE });
  } catch (error) {
    return errorResponse(error, "Counting your new replies");
  }
}
