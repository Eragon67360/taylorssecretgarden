import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/*
  The test Member and the guard around everything that writes: signing up,
  signing in and publishing Posts only ever happen on a disposable Neon branch
  (CI creates one per run, see .github/workflows/ci.yml), never on production.
*/

/** SHA-256 of the production branch's Neon endpoint id (its database and auth hosts start with it). */
const PRODUCTION_ENDPOINT_SHA256 = "cdc996f786d728b68a037dff488ccec4f2708269ccb6a53a30da6e5ce6135b5b";

/** `ep-cool-name-123` from a Neon database or Neon Auth URL. */
function endpointOf(url: string): string | null {
	try {
		return new URL(url).hostname.match(/^(ep-[a-z0-9-]+?)(?:-pooler)?\./)?.[1] ?? null;
	} catch {
		return null;
	}
}

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

/**
 * Why tests that create Members or publish Posts must not run here, or null
 * when the app runs on a disposable Neon branch: DATABASE_URL and
 * NEON_AUTH_BASE_URL both set, on the same Neon endpoint, and not production's.
 */
export function writeGuard(env: NodeJS.ProcessEnv = process.env): string | null {
	const { DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET } = env;

	if (!DATABASE_URL || !NEON_AUTH_BASE_URL || !NEON_AUTH_COOKIE_SECRET) {
		return "Needs DATABASE_URL, NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET of a disposable Neon branch";
	}

	const database = endpointOf(DATABASE_URL);
	const auth = endpointOf(NEON_AUTH_BASE_URL);

	if (!database || !auth) return "DATABASE_URL and NEON_AUTH_BASE_URL must point at a Neon branch";
	if (database !== auth) return "DATABASE_URL and NEON_AUTH_BASE_URL are on different Neon branches";
	if (sha256(database) === PRODUCTION_ENDPOINT_SHA256) return "Refusing to sign up or publish on the production database";

	return null;
}

/** Where the setup project leaves the test Member (e2e/member.setup.ts); git-ignored. */
export const MEMBER_DIR = path.join(__dirname, ".auth");
export const MEMBER_STATE = path.join(MEMBER_DIR, "member-state.json");
export const MEMBER_FILE = path.join(MEMBER_DIR, "member.json");

export type TestMember = { name: string; email: string; password: string };

/** A fresh test Member for this run: unique email, random password. */
export function newTestMember(): TestMember {
	const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	return {
		name: "Swiftter Tester",
		email: `swiftter-e2e-${id}@example.com`,
		password: `Eras-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
	};
}

/** The test Member the setup project signed up, if it ran. */
export function readTestMember(): TestMember | null {
	return existsSync(MEMBER_FILE) ? (JSON.parse(readFileSync(MEMBER_FILE, "utf8")) as TestMember) : null;
}
