import { NextResponse } from "next/server";

import { getAuth } from "@/lib/auth/server";
import { isBot } from "@/lib/bot-protection";
import { isBotIdProtected } from "@/lib/botid-routes";

/*
  Neon Auth's API on this origin: sign-up, sign-in (email and Google),
  sign-out and the session. Every request is proxied to the branch's Neon Auth
  URL, and its session cookies are set here, first-party. Signing up and
  signing in are refused to bots (Vercel BotID) before they reach Neon Auth.
*/
type Context = { params: Promise<{ path: string[] }> };

const handler = async (request: Request, context: Context) => {
	if (isBotIdProtected(request.method, new URL(request.url).pathname) && (await isBot(request))) {
		return NextResponse.json({ code: "BOT_DETECTED", message: "Access denied." }, { status: 403 });
	}

	const methods = getAuth().handler();

	return methods[request.method as keyof typeof methods](request, context);
};

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
