import "server-only";

import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

/**
 * Neon Auth on the server (docs/adr/0004-neon-auth-replaces-clerk.md): the
 * Members' accounts live in the `neon_auth` schema of Swiftter's database and
 * the browser only ever talks to this origin (app/api/auth/[...path]).
 *
 * Created on first use, not at import, so `next build` needs no auth settings.
 */
let instance: NeonAuth | undefined;

export function getAuth(): NeonAuth {
	if (instance) return instance;

	const baseUrl = process.env.NEON_AUTH_BASE_URL;
	const secret = process.env.NEON_AUTH_COOKIE_SECRET;

	if (!baseUrl) throw new Error("NEON_AUTH_BASE_URL is not set: sign-in needs the Neon Auth URL of the database's branch.");
	if (!secret) throw new Error("NEON_AUTH_COOKIE_SECRET is not set: sign-in needs a secret (32+ characters) to sign its cookies.");

	instance = createNeonAuth({ baseUrl, cookies: { secret } });

	return instance;
}

/** The person signed in on this request, or null. */
export async function getSessionUser() {
	const { data } = await getAuth().getSession();

	return data?.user ?? null;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
