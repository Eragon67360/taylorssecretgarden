import { generateKeyPairSync, sign } from "node:crypto";

/*
  A stand-in for Neon Auth's webhook signing (https://neon.com/docs/auth/guides/webhooks):
  a local Ed25519 key pair published as a JWKS, and calls signed the way
  Neon Auth signs them (a detached JWS over the timestamp and the raw body).
*/
export const KID = "01dec52b-4666-40f7-87ed-6423552eecaf";

export const { privateKey, publicKey } = generateKeyPairSync("ed25519");

/** The JWKS Neon Auth would publish: the public key, with its kid and alg as Neon lists them. */
export const JWKS = { keys: [{ ...publicKey.export({ format: "jwk" }), kid: KID, alg: "EdDSA" }] };

const base64url = (text: string) => Buffer.from(text, "utf8").toString("base64url");

/** The X-Neon-* headers for `body`, signed now (or at `timestamp`) with `key`. */
export function signedHeaders(body: string, { timestamp = Date.now(), kid = KID, key = privateKey, alg = "EdDSA" } = {}): Record<string, string> {
  const header = base64url(JSON.stringify({ alg, typ: "JWS", kid: kid.slice(0, 8) }));
  const payload = base64url(`${timestamp}.${base64url(body)}`);
  const signature = sign(null, Buffer.from(`${header}.${payload}`), key).toString("base64url");

  return {
    "x-neon-signature": `${header}..${signature}`,
    "x-neon-signature-kid": kid,
    "x-neon-timestamp": String(timestamp),
  };
}

/** A `send.otp` event as Neon Auth documents it. */
export function otpEvent(overrides: { otp_type?: string; name?: string | null; otp_code?: string } = {}) {
  return {
    event_id: "550e8400-e29b-41d4-a716-446655440000",
    event_type: "send.otp",
    timestamp: "2026-10-01T12:00:00.000Z",
    context: { endpoint_id: "ep-cool-sound-12345678", project_name: "Taylor's Secret Garden" },
    user: { id: "a1b2c3d4", email: "member@example.com", name: overrides.name === undefined ? "Jane Smith" : overrides.name, email_verified: false },
    event_data: {
      otp_code: overrides.otp_code ?? "123456",
      otp_type: overrides.otp_type ?? "email-verification",
      expires_at: "2026-10-01T12:05:00.000Z",
      ip_address: "192.0.2.1",
      user_agent: "Mozilla/5.0",
    },
  };
}

/** A `send.magic_link` event for a password reset, as Neon Auth documents it. */
export function linkEvent() {
  return {
    event_id: "7d9f1c2e-0000-4000-8000-000000000001",
    event_type: "send.magic_link",
    timestamp: "2026-10-01T12:00:00.000Z",
    context: { endpoint_id: "ep-cool-sound-12345678", project_name: "Taylor's Secret Garden" },
    user: { email: "member@example.com" },
    event_data: {
      link_type: "forget-password",
      link_url: "https://ep-test.neonauth.example/neondb/auth/reset-password/tok3nTok3n?callbackURL=https%3A%2F%2Fwww.taylorssecretgarden.com%2Freset-password",
      token: "tok3nTok3n",
      expires_at: "2026-10-01T13:00:00.000Z",
      ip_address: "192.0.2.1",
      user_agent: "Mozilla/5.0",
    },
  };
}
