import "server-only";

import { type JsonWebKey, type KeyObject, createPublicKey, verify } from "node:crypto";

/*
  Checking that a webhook call really comes from Neon Auth, as its docs say
  (https://neon.com/docs/auth/guides/webhooks#signature-verification): an
  Ed25519 detached JWS in X-Neon-Signature (`header..signature`), signed with
  the key named by X-Neon-Signature-Kid in the branch's JWKS
  (`<NEON_AUTH_BASE_URL>/.well-known/jwks.json`), over the timestamp and the
  raw body:

    signingInput = header + "." + base64url(timestamp + "." + base64url(rawBody))

  X-Neon-Timestamp (milliseconds) is inside the signature, so an old call
  cannot be replayed with a fresh one: calls older than five minutes (Neon's
  recommendation) are refused, and so are calls from more than five minutes
  in the future (clocks drift, but not that much).
*/

/** How far X-Neon-Timestamp may be from now. */
export const FRESHNESS_MS = 5 * 60_000;

/** How long the JWKS is trusted before it is fetched again. */
const JWKS_TTL_MS = 10 * 60_000;

/** At most one refetch this often for a key the cached JWKS does not have: a forged kid cannot make every call fetch. */
const JWKS_REFETCH_MS = 30_000;

/** How long one JWKS fetch may take: Neon Auth waits 5 seconds per attempt for the whole call. */
const JWKS_TIMEOUT_MS = 2_000;

type Jwk = JsonWebKey & { kid?: string };

export type KeyLookup = (kid: string) => Promise<KeyObject | undefined>;

/**
 * The JWKS at `url`, kept in memory for JWKS_TTL_MS, as a lookup by kid. A kid
 * it does not know refetches the JWKS (a rotated key); either way, at most
 * every JWKS_REFETCH_MS. Only Ed25519 keys are kept. Throws when the JWKS cannot be
 * fetched and none is cached.
 */
export function jwksKeyLookup(url: string, { fetch: send = fetch, now = Date.now } = {}): KeyLookup {
  let keys = new Map<string, KeyObject>();
  let fetchedAt = -Infinity;
  let attemptedAt = -Infinity;
  let inFlight: Promise<void> | undefined;

  const refresh = () =>
    (inFlight ??= (async () => {
      attemptedAt = now();
      try {
        const response = await send(url, { signal: AbortSignal.timeout(JWKS_TIMEOUT_MS) });

        if (!response.ok) throw new Error(`the JWKS answered ${response.status}`);
        const { keys: listed } = (await response.json()) as { keys?: Jwk[] };
        const next = new Map<string, KeyObject>();

        for (const jwk of listed ?? []) {
          if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || !jwk.kid) continue;
          next.set(jwk.kid, createPublicKey({ key: { kty: jwk.kty, crv: jwk.crv, x: jwk.x }, format: "jwk" }));
        }
        keys = next;
        fetchedAt = now();
      } finally {
        inFlight = undefined;
      }
    })());

  return async (kid) => {
    const stale = now() - fetchedAt > JWKS_TTL_MS || !keys.has(kid);

    // Never more than one fetch every JWKS_REFETCH_MS, even while the JWKS cannot be reached.
    if (stale && now() - attemptedAt > JWKS_REFETCH_MS) {
      try {
        await refresh();
      } catch (error) {
        // A JWKS that cannot be fetched again: the cached keys still verify, if there are any.
        if (fetchedAt === -Infinity) throw error;
      }
    }

    return keys.get(kid);
  };
}

export type SignatureHeaders = { signature: string | null; kid: string | null; timestamp: string | null };

/** Why a call was refused, for the log only: the caller answers 401 with no detail. */
export type SignatureFailure = "missing headers" | "malformed signature" | "stale timestamp" | "unknown key" | "bad signature";

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/**
 * Whether `rawBody` was signed by Neon Auth with these headers, and recently:
 * `{ ok: true }`, or why not. Throws only when the key cannot be looked up at
 * all (the JWKS unreachable), which is not the caller's fault.
 */
export async function verifyNeonSignature(
  rawBody: string,
  { signature, kid, timestamp }: SignatureHeaders,
  lookup: KeyLookup,
  now = Date.now(),
): Promise<{ ok: true } | { ok: false; reason: SignatureFailure }> {
  if (!signature || !kid || !timestamp) return { ok: false, reason: "missing headers" };

  const parts = signature.split(".");
  const [header, detached, signed] = parts;

  if (parts.length !== 3 || detached !== "" || !BASE64URL.test(header) || !BASE64URL.test(signed)) return { ok: false, reason: "malformed signature" };

  try {
    const { alg } = JSON.parse(Buffer.from(header, "base64url").toString("utf8")) as { alg?: unknown };

    // EdDSA, or its newer, fully specified name (RFC 9864).
    if (alg !== "EdDSA" && alg !== "Ed25519") return { ok: false, reason: "malformed signature" };
  } catch {
    return { ok: false, reason: "malformed signature" };
  }

  if (!/^\d{1,15}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > FRESHNESS_MS) return { ok: false, reason: "stale timestamp" };

  const key = await lookup(kid);

  if (!key) return { ok: false, reason: "unknown key" };

  const payload = Buffer.from(`${timestamp}.${Buffer.from(rawBody, "utf8").toString("base64url")}`, "utf8").toString("base64url");
  const valid = verify(null, Buffer.from(`${header}.${payload}`), key, Buffer.from(signed, "base64url"));

  return valid ? { ok: true } : { ok: false, reason: "bad signature" };
}
