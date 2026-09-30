import { createHash } from "node:crypto";

/*
  The guard around everything that writes test data: the e2e suite's sign-ups
  and Posts, the integration tests, and the seed scripts (scripts/seed.ts,
  scripts/unseed.ts). They only ever run on a disposable or development Neon
  branch, never on production, whatever the environment says.
*/

/** SHA-256 of the production branch's Neon endpoint id (its database and auth hosts start with it). */
const PRODUCTION_ENDPOINT_SHA256 = "cdc996f786d728b68a037dff488ccec4f2708269ccb6a53a30da6e5ce6135b5b";

/** `ep-cool-name-123` from a Neon database or Neon Auth URL. */
export function endpointOf(url: string): string | null {
	try {
		return new URL(url).hostname.match(/^(ep-[a-z0-9-]+?)(?:-pooler)?\./)?.[1] ?? null;
	} catch {
		return null;
	}
}

/** The environment variables the guards read (process.env, or a test's own). */
type Env = Partial<Record<string, string>>;

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

/** Whether a Neon database or Neon Auth URL is the production branch's (`production`: its endpoint's SHA-256, for tests). */
export const isProductionEndpoint = (url: string, production = PRODUCTION_ENDPOINT_SHA256) => {
	const endpoint = endpointOf(url);

	return endpoint !== null && sha256(endpoint) === production;
};

/**
 * Why tests that create Members or publish Posts must not run here, or null
 * when the app runs on a disposable Neon branch: DATABASE_URL and
 * NEON_AUTH_BASE_URL both set, on the same Neon endpoint, and not production's.
 */
export function writeGuard(env: Env = process.env, production = PRODUCTION_ENDPOINT_SHA256): string | null {
	const { DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET } = env;

	if (!DATABASE_URL || !NEON_AUTH_BASE_URL || !NEON_AUTH_COOKIE_SECRET) {
		return "Needs DATABASE_URL, NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET of a disposable Neon branch";
	}

	const database = endpointOf(DATABASE_URL);
	const auth = endpointOf(NEON_AUTH_BASE_URL);

	if (!database || !auth) return "DATABASE_URL and NEON_AUTH_BASE_URL must point at a Neon branch";
	if (database !== auth) return "DATABASE_URL and NEON_AUTH_BASE_URL are on different Neon branches";
	if (isProductionEndpoint(DATABASE_URL, production)) return "Refusing to sign up or publish on the production database";

	return null;
}

/**
 * Why the seed scripts must not run here, or null: writeGuard, and never
 * with NODE_ENV or VERCEL_ENV set to production, whichever database that
 * points at.
 */
export function seedGuard(env: Env = process.env, production = PRODUCTION_ENDPOINT_SHA256): string | null {
	if (env.NODE_ENV === "production") return "Refusing to seed or unseed with NODE_ENV=production";
	if (env.VERCEL_ENV === "production") return "Refusing to seed or unseed with VERCEL_ENV=production";

	return writeGuard(env, production);
}
