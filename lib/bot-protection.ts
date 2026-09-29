import "server-only";

import { checkBotId } from "botid/server";

import { BOTID_TOKEN_HEADER } from "./botid-routes";

/**
 * Vercel BotID's server half: whether a request to a protected route
 * (lib/botid-routes.ts) comes from a bot.
 *
 * On Vercel, BotID classifies the request from the token the browser attached
 * (Basic mode, free; Deep Analysis is a Firewall setting in the dashboard).
 * Anywhere else (`next dev`, `next start` locally and in CI) there is no
 * Vercel OIDC token, so BotID cannot verify anything: the stand-in treats a
 * request carrying a token as human and one without as a bot, which is what
 * the Playwright suite checks.
 */
export async function isBot(request: Request): Promise<boolean> {
	if (!process.env.VERCEL) return !request.headers.has(BOTID_TOKEN_HEADER);

	const verification = await checkBotId();

	return verification.isBot;
}
