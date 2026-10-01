import { NextResponse } from "next/server";

import { AuthUnavailableError, getSessionUser } from "@/lib/auth/server";
import { errorResponse } from "@/lib/swiftter-responses";
import { exportMemberData } from "@/service/swiftter";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * The signed-in Member's data, as a JSON download (GDPR arts. 15 and 20):
 * their account's name and email, their Member row, every note of theirs in
 * any state, their reshares and every moderation decision on their notes.
 * Never cached. 401 signed out, 503 when Neon Auth fails.
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
    const data = {
      exportedAt: new Date().toISOString(),
      account: { id: user.id, name: user.name ?? null, email: user.email },
      ...(await exportMemberData(user.id)),
    };

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        ...PRIVATE,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="taylors-secret-garden-my-data.json"',
      },
    });
  } catch (error) {
    return errorResponse(error, "Gathering your data");
  }
}
