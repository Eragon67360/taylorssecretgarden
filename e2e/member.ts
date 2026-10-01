import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/*
  The test Member and the guard around everything that writes: signing up,
  signing in and publishing Posts only ever happen on a disposable Neon branch
  (CI creates one per run, see .github/workflows/ci.yml), never on production.
  The guard itself lives in db/guard.ts, shared with the seed scripts.
*/
export { writeGuard } from "../db/guard";

/** Where the setup project leaves the test Member (e2e/member.setup.ts); git-ignored. */
export const MEMBER_DIR = path.join(__dirname, ".auth");
export const MEMBER_STATE = path.join(MEMBER_DIR, "member-state.json");
export const MEMBER_FILE = path.join(MEMBER_DIR, "member.json");

export type TestMember = { name: string; email: string; password: string };

/** A fresh test Member for this run: unique email, random password. */
export function newTestMember(): TestMember {
  const id = `${Date.now()}-${randomBytes(4).toString("hex")}`;

  return {
    name: "Swiftter Tester",
    email: `swiftter-e2e-${id}@example.com`,
    // From crypto: a password, even a test one, should not come from Math.random().
    password: `Eras-${randomBytes(18).toString("base64url")}`,
  };
}

/** The test Member the setup project signed up, if it ran. */
export function readTestMember(): TestMember | null {
  return existsSync(MEMBER_FILE) ? (JSON.parse(readFileSync(MEMBER_FILE, "utf8")) as TestMember) : null;
}

/**
 * BotID's token header, for requests the tests send without a browser. Off
 * Vercel (locally, CI) BotID cannot verify tokens, so the app's stand-in
 * (lib/bot-protection.ts) treats a request carrying one as human and one
 * without as a bot; the browser gets a real token from BotID's challenge.
 */
export const BOTID_HUMAN = { "x-is-human": "e2e" };
