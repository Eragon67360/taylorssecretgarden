import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthUnavailableError, getSessionUser } from "@/lib/auth/server";
import { memberWrite } from "@/lib/member-write";
import { errorResponse } from "@/lib/swiftter-responses";
import { feedChanged } from "@/service/feed-cache";
import { deleteMemberAccount, listHeld, listOwnReshares } from "@/service/swiftter";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * What only the signed-in Member sees: their notes that are not public
 * (pending or refused, with the reason) and the Posts they reshare. Kept out
 * of the public feed, which is the same for everyone. 401 signed out, 503 when
 * Neon Auth fails.
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
    const [held, reshared] = await Promise.all([listHeld(user.id), listOwnReshares(user.id)]);

    return NextResponse.json({ held, reshared }, { headers: PRIVATE });
  } catch (error) {
    return errorResponse(error, "Reading your notes");
  }
}

/** Neon Auth's cookies (session, cached session data, OAuth challenge) all start with this. */
const AUTH_COOKIE_PREFIX = "__Secure-neon-auth";

/**
 * Deletes the signed-in Member's account (GDPR art. 17): their notes are torn
 * up (threads stay readable, with no name on them), their reshares go, their
 * Member row is emptied and their Neon Auth account deleted
 * (deleteMemberAccount). 204, and every Neon Auth cookie is expired: they are
 * signed out on this response. After memberWrite's checks (403/401/503).
 */
export function DELETE(request: Request) {
  return memberWrite(
    request,
    async (writer) => {
      try {
        await deleteMemberAccount(writer.id);
        // Their notes and reshares leave the feed: its cached first page is out of date.
        feedChanged();
      } catch (error) {
        return errorResponse(error, "Deleting your account");
      }

      const store = await cookies();

      for (const { name } of store.getAll()) {
        // `__Secure-` cookies are only replaced by a Secure one: expired the way Neon Auth set them.
        if (name.startsWith(AUTH_COOKIE_PREFIX)) store.set(name, "", { path: "/", maxAge: 0, secure: true, httpOnly: true, sameSite: "lax" });
      }

      return new NextResponse(null, { status: 204, headers: PRIVATE });
    },
    { body: false },
  );
}
