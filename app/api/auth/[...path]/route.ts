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

const handler = async (request: Request, context: Context) => {
	// The decoded path segments, which are what Neon Auth's handler proxies
	// (so `sign%2Dup` cannot slip past as something else).
	const { path } = await context.params;

	if (isBotIdProtected(request.method, `/api/auth/${path.join("/")}`) && (await isBot(request))) {
		// Shaped like Neon Auth's own errors, which the guestbook form reads (`code`).
		return NextResponse.json({ code: "BOT_DETECTED", message: BOT_REFUSAL }, { status: 403 });
	}

	const methods = getAuth().handler();

	return methods[request.method as keyof typeof methods](request, context);
};

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
