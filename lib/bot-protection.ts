import "server-only";

import { checkBotId } from "botid/server";

import { BOTID_TOKEN_HEADER } from "./botid-routes";

/**
 * Vercel BotID's server half: whether a request to a protected route
 * (lib/botid-routes.ts) comes from a bot, and must be refused (403).
 *
 * On Vercel, BotID classifies the request from the token the browser attached
 * (Basic mode, free; Deep Analysis is a Firewall setting in the dashboard). A
 * check that cannot be made (BotID unreachable, no OIDC token) counts as a
 * bot: the Member is asked to reload and try again.
 *
 * Anywhere else (`next dev`, `next start` locally and in CI) there is no
 * Vercel OIDC token, so BotID cannot verify anything: the stand-in treats a
 * request carrying a token as human and one without as a bot, which is what
 * the Playwright suite checks. (A host other than Vercel would therefore trust
 * any token: the site is only deployed on Vercel.)
 */
export async function isBot(request: Request): Promise<boolean> {
	if (!process.env.VERCEL) return !request.headers.has(BOTID_TOKEN_HEADER);

	try {
		const verification = await checkBotId();

		return verification.isBot;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("BotID check failed", error);

		return true;
	}
}
