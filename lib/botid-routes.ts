/**
 * The routes Vercel BotID guards: the ones a script would abuse. The browser
 * attaches BotID's token to requests matching these (instrumentation-client.ts)
 * and the routes refuse requests without a valid one (lib/bot-protection.ts):
 * every Swiftter write (lib/member-write.ts), and signing up or signing in
 * (email or Google), checked in front of Neon Auth in app/api/auth/[...path].
 *
 * `*` matches the rest of the path, as BotID's client reads it.
 */
export const BOTID_PROTECTED_ROUTES = [
	{ path: "/api/swiftter/posts", method: "POST" },
	// Tearing up, resharing and undoing it, "check again": every other Swiftter write (lib/member-write.ts).
	{ path: "/api/swiftter/posts/*", method: "POST" },
	{ path: "/api/swiftter/posts/*", method: "DELETE" },
	{ path: "/api/auth/sign-up/*", method: "POST" },
	{ path: "/api/auth/sign-in/*", method: "POST" },
];

/** What a Member reads when BotID refuses their request (403). */
export const BOT_REFUSAL = "This browser couldn't be checked just now. Reload the page and try again.";

/** The header BotID's client adds, carrying its token. */
export const BOTID_TOKEN_HEADER = "x-is-human";

/** Whether a request (method and path) is one BotID guards. */
export function isBotIdProtected(method: string, pathname: string): boolean {
	return BOTID_PROTECTED_ROUTES.some(
		(route) =>
			route.method === method.toUpperCase() &&
			(route.path.endsWith("/*") ? pathname.startsWith(route.path.slice(0, -1)) : pathname === route.path),
	);
}
