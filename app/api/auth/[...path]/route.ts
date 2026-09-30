import { NextResponse } from "next/server";

import { getAuth } from "@/lib/auth/server";
import { isBot } from "@/lib/bot-protection";
import { BOT_REFUSAL, isBotIdProtected } from "@/lib/botid-routes";

/*
  Neon Auth's API on this origin: sign-up, sign-in (email and Google),
  sign-out and the session. Every request is proxied to the branch's Neon Auth
  URL, and its session cookies are set here, first-party. Signing up and
  signing in are refused to bots (Vercel BotID) before they reach Neon Auth.
*/
type Context = { params: Promise<{ path: string[] }> };

/** Neon Auth's cookies (session, cached session data, OAuth challenge) all start with this. */
const AUTH_COOKIE_PREFIX = "__Secure-neon-auth";

/**
 * A visitor asking "am I signed in?" with no Neon Auth cookie at all (and no
 * Google sign-in coming back, which carries a query): the answer is no, so it
 * is given here instead of asking Neon Auth. Every visitor's check would
 * otherwise reach Neon Auth from this server's one address, and share its
 * rate limit with every sign-in.
 */
function isAnonymousSessionCheck(request: Request, path: string[]) {
	if (request.method !== "GET" || path.join("/") !== "get-session" || new URL(request.url).search) return false;

	return !(request.headers.get("cookie") ?? "").split(";").some((cookie) => cookie.trim().startsWith(AUTH_COOKIE_PREFIX));
}

const handler = async (request: Request, context: Context) => {
	// The decoded path segments, which are what Neon Auth's handler proxies
	// (so `sign%2Dup` cannot slip past as something else).
	const { path } = await context.params;

	if (isAnonymousSessionCheck(request, path)) return NextResponse.json(null, { headers: { "Cache-Control": "private, no-store" } });

	if (isBotIdProtected(request.method, `/api/auth/${path.join("/")}`) && (await isBot(request))) {
		// Shaped like Neon Auth's own errors, which the guestbook form reads (`code`).
		return NextResponse.json({ code: "BOT_DETECTED", message: BOT_REFUSAL }, { status: 403 });
	}

	const methods = getAuth().handler();

	return methods[request.method as keyof typeof methods](request, context);
};

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
