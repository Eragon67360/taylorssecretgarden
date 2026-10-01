import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { FRESHNESS_MS, jwksKeyLookup, verifyNeonSignature } from "@/lib/auth/webhook-signature";

import { JWKS, KID, otpEvent, signedHeaders } from "./neon-webhook";

// Neon Auth is never called: the JWKS comes from a stand-in fetch, and calls
// are signed with a key pair made for the test (./neon-webhook.ts).

const NOW = 1_790_000_000_000;
const URL = "https://auth.example.invalid/neondb/auth/.well-known/jwks.json";

function fakeJwks(jwks: unknown = JWKS, status = 200) {
  const send = vi.fn(async () => Response.json(jwks, { status }));

  return { send, fetch: send as unknown as typeof fetch };
}

const headersOf = (headers: Record<string, string>) => ({
  signature: headers["x-neon-signature"] ?? null,
  kid: headers["x-neon-signature-kid"] ?? null,
  timestamp: headers["x-neon-timestamp"] ?? null,
});

const body = JSON.stringify(otpEvent());

describe("verifyNeonSignature", () => {
  it("accepts a call signed by the JWKS's key, now", async () => {
    const lookup = jwksKeyLookup(URL, { ...fakeJwks(), now: () => NOW });

    await expect(verifyNeonSignature(body, headersOf(signedHeaders(body, { timestamp: NOW })), lookup, NOW)).resolves.toEqual({ ok: true });
  });

  it("accepts a timestamp within five minutes either way", async () => {
    const lookup = jwksKeyLookup(URL, { ...fakeJwks(), now: () => NOW });

    for (const timestamp of [NOW - FRESHNESS_MS + 1000, NOW + FRESHNESS_MS - 1000]) {
      await expect(verifyNeonSignature(body, headersOf(signedHeaders(body, { timestamp })), lookup, NOW)).resolves.toEqual({ ok: true });
    }
  });

  it("refuses a kid the JWKS does not list", async () => {
    const jwks = fakeJwks();
    const lookup = jwksKeyLookup(URL, { fetch: jwks.fetch, now: () => NOW });

    await expect(verifyNeonSignature(body, headersOf(signedHeaders(body, { timestamp: NOW, kid: "someone-else" })), lookup, NOW)).resolves.toEqual({
      ok: false,
      reason: "unknown key",
    });
  });

  it("refuses a body changed after signing", async () => {
    const lookup = jwksKeyLookup(URL, { ...fakeJwks(), now: () => NOW });
    const headers = headersOf(signedHeaders(body, { timestamp: NOW }));
    const tampered = body.replace("123456", "654321");

    await expect(verifyNeonSignature(tampered, headers, lookup, NOW)).resolves.toEqual({ ok: false, reason: "bad signature" });
  });

  it("refuses a timestamp changed after signing, even a fresh one", async () => {
    const lookup = jwksKeyLookup(URL, { ...fakeJwks(), now: () => NOW });
    const headers = headersOf(signedHeaders(body, { timestamp: NOW - 1000 }));

    await expect(verifyNeonSignature(body, { ...headers, timestamp: String(NOW) }, lookup, NOW)).resolves.toEqual({ ok: false, reason: "bad signature" });
  });

  it("refuses a stale call (a replay) before looking up any key", async () => {
    const jwks = fakeJwks();
    const lookup = jwksKeyLookup(URL, { fetch: jwks.fetch, now: () => NOW });

    for (const timestamp of [NOW - FRESHNESS_MS - 1, NOW + FRESHNESS_MS + 1]) {
      await expect(verifyNeonSignature(body, headersOf(signedHeaders(body, { timestamp })), lookup, NOW)).resolves.toEqual({
        ok: false,
        reason: "stale timestamp",
      });
    }
    expect(jwks.send).not.toHaveBeenCalled();
  });

  it("refuses a call signed by another key under the right kid", async () => {
    const lookup = jwksKeyLookup(URL, { ...fakeJwks(), now: () => NOW });
    const { privateKey: other } = generateKeyPairSync("ed25519");

    await expect(verifyNeonSignature(body, headersOf(signedHeaders(body, { timestamp: NOW, key: other })), lookup, NOW)).resolves.toEqual({
      ok: false,
      reason: "bad signature",
    });
  });

  it("refuses missing headers, an attached payload, and another algorithm", async () => {
    const lookup = jwksKeyLookup(URL, { ...fakeJwks(), now: () => NOW });
    const good = headersOf(signedHeaders(body, { timestamp: NOW }));
    const [header, , signature] = good.signature!.split(".");

    await expect(verifyNeonSignature(body, { ...good, signature: null }, lookup, NOW)).resolves.toEqual({ ok: false, reason: "missing headers" });
    await expect(verifyNeonSignature(body, { ...good, kid: null }, lookup, NOW)).resolves.toEqual({ ok: false, reason: "missing headers" });
    await expect(verifyNeonSignature(body, { ...good, signature: `${header}.e30.${signature}` }, lookup, NOW)).resolves.toEqual({
      ok: false,
      reason: "malformed signature",
    });
    await expect(verifyNeonSignature(body, headersOf(signedHeaders(body, { timestamp: NOW, alg: "HS256" })), lookup, NOW)).resolves.toEqual({
      ok: false,
      reason: "malformed signature",
    });
    await expect(verifyNeonSignature(body, { ...good, timestamp: "soon" }, lookup, NOW)).resolves.toEqual({ ok: false, reason: "stale timestamp" });
  });
});

describe("jwksKeyLookup", () => {
  it("keeps the JWKS in memory between calls", async () => {
    const jwks = fakeJwks();
    let now = NOW;
    const lookup = jwksKeyLookup(URL, { fetch: jwks.fetch, now: () => now });

    expect(await lookup(KID)).toBeDefined();
    now += 60_000;
    expect(await lookup(KID)).toBeDefined();
    expect(jwks.send).toHaveBeenCalledTimes(1);
    expect(jwks.send).toHaveBeenCalledWith(URL, expect.anything());
  });

  it("fetches it again after its time to live", async () => {
    const jwks = fakeJwks();
    let now = NOW;
    const lookup = jwksKeyLookup(URL, { fetch: jwks.fetch, now: () => now });

    await lookup(KID);
    now += 11 * 60_000;
    await lookup(KID);
    expect(jwks.send).toHaveBeenCalledTimes(2);
  });

  it("fetches it again for an unknown kid (a rotated key), but not on every call", async () => {
    const jwks = fakeJwks();
    let now = NOW;
    const lookup = jwksKeyLookup(URL, { fetch: jwks.fetch, now: () => now });

    await lookup(KID);
    now += 31_000;
    expect(await lookup("rotated")).toBeUndefined();
    expect(await lookup("rotated")).toBeUndefined();
    expect(jwks.send).toHaveBeenCalledTimes(2);
  });

  it("keeps only Ed25519 keys", async () => {
    const lookup = jwksKeyLookup(URL, { ...fakeJwks({ keys: [{ kty: "RSA", kid: KID, n: "x", e: "AQAB" }] }), now: () => NOW });

    expect(await lookup(KID)).toBeUndefined();
  });

  it("throws when the JWKS cannot be fetched and none is cached; keeps the cached one when it can't be refreshed", async () => {
    const down = fakeJwks({}, 503);

    await expect(jwksKeyLookup(URL, { fetch: down.fetch, now: () => NOW })(KID)).rejects.toThrow(/503/);

    let now = NOW;
    let up = true;
    const flaky = vi.fn(async () => (up ? Response.json(JWKS) : new Response(null, { status: 503 })));
    const lookup = jwksKeyLookup(URL, { fetch: flaky as unknown as typeof fetch, now: () => now });

    await lookup(KID);
    up = false;
    now += 11 * 60_000;
    expect(await lookup(KID)).toBeDefined();
  });
});
