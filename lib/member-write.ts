import "server-only";

import { NextResponse } from "next/server";

import { isEmailVerificationRequired, UNVERIFIED_REFUSAL } from "@/lib/auth/email-verification";
import { AuthUnavailableError, getSessionUser } from "@/lib/auth/server";
import { isBot } from "@/lib/bot-protection";
import { BOT_REFUSAL } from "@/lib/botid-routes";

/** The signed-in person a write acts for. */
export type Writer = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

type Handler = (writer: Writer, body: Record<string, unknown>) => Promise<Response>;

const json = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Whether a browser sent the request from another site. Browsers label every
 * request with Sec-Fetch-Site (and Origin on writes); a request with neither
 * is not from a browser (a script, the test suite), so it cannot be a forged
 * cross-site request riding a victim's cookies, and still needs a session.
 */
export function isCrossSite(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");

  if (site && site !== "same-origin" && site !== "none") return true;

  const origin = request.headers.get("origin");

  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/**
 * Every Swiftter write goes through here, in this order:
 * 1. from this site only (403): no forged cross-site requests;
 * 2. a JSON body when the route takes one (415);
 * 3. signed in (401), with Neon Auth answering (503 if it fails, not a false 401);
 * 4. Vercel BotID (403): every write route is listed in lib/botid-routes.ts;
 * 5. a confirmed email address (403), when REQUIRE_EMAIL_VERIFICATION is on
 *    (lib/auth/email-verification.ts), unless `verifiedEmail: false`: tearing
 *    up one's own notes and deleting one's account never wait on it.
 * Ownership and visibility are then checked in SQL by the handler (404).
 */
export async function memberWrite(request: Request, handler: Handler, { body = true, verifiedEmail = true } = {}): Promise<Response> {
  if (isCrossSite(request)) return json(403, "Requests from other sites are not accepted.");

  let parsed: Record<string, unknown> = {};

  if (body) {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return json(415, "Expected a JSON body (Content-Type: application/json).");
    }
    const value = (await request.json().catch(() => null)) as unknown;

    if (!value || typeof value !== "object" || Array.isArray(value)) return json(400, "Expected a JSON object.");
    parsed = value as Record<string, unknown>;
  }

  let writer: Writer | null;

  try {
    writer = await getSessionUser();
    // The cookie's copy of the session can lag behind an address confirmed
    // elsewhere: only an unconfirmed writer pays for asking Neon Auth itself.
    if (writer && !writer.emailVerified && verifiedEmail && isEmailVerificationRequired()) writer = await getSessionUser({ fresh: true });
  } catch (error) {
    if (!(error instanceof AuthUnavailableError)) throw error;
    // eslint-disable-next-line no-console
    console.error("Neon Auth unavailable", error.message);

    return json(503, "Signing in is unavailable just now, so nothing was changed. Try again in a moment.");
  }

  if (!writer) return json(401, "Sign in first.");
  if (await isBot(request)) return json(403, BOT_REFUSAL);
  if (!writer.emailVerified && verifiedEmail && isEmailVerificationRequired()) return json(403, UNVERIFIED_REFUSAL);

  return handler(writer, parsed);
}
