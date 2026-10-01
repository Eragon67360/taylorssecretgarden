import type { OwnerAlert } from "@/service/owner-alerts";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth-email/route";
import { handleAuthEmailWebhook } from "@/service/auth-email";

import { JWKS, linkEvent, otpEvent, signedHeaders } from "./neon-webhook";

// The account email webhook (app/api/auth-email), end to end with fetch
// mocked: Neon Auth's JWKS and Resend's API are stand-ins, the calls are
// signed with the test's key pair (./neon-webhook.ts).

const deferred = vi.hoisted(() => [] as (() => unknown)[]);

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => deferred.push(task),
}));

const AUTH_URL = "https://ep-test.neonauth.example/neondb/auth";
const RESEND = "https://api.resend.com/emails";

type Call = { url: string; init?: RequestInit };

/** Neon Auth's JWKS and Resend, answering `resend` (Resend's status and body). */
function stubNetwork(resend: { status: number; body: unknown } = { status: 200, body: { id: "re_123" } }) {
  const calls: Call[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);

      calls.push({ url, init });
      if (url === `${AUTH_URL}/.well-known/jwks.json`) return Response.json(JWKS);
      if (url === RESEND) return Response.json(resend.body, { status: resend.status });

      return new Response(null, { status: 404 });
    }),
  );

  return { resendCalls: () => calls.filter((call) => call.url === RESEND) };
}

function webhook(event: unknown, { headers = {}, sign = true }: { headers?: Record<string, string>; sign?: boolean } = {}) {
  const body = JSON.stringify(event);

  return new Request("https://www.taylorssecretgarden.com/api/auth-email", {
    method: "POST",
    headers: { "content-type": "application/json", "x-neon-delivery-attempt": "1", ...(sign ? signedHeaders(body) : {}), ...headers },
    body,
  });
}

beforeEach(() => {
  vi.stubEnv("NEON_AUTH_BASE_URL", AUTH_URL);
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("OWNER_ALERTS_GITHUB_TOKEN", "");
  deferred.length = 0;
  for (const level of ["info", "warn", "error"] as const) vi.spyOn(console, level).mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Everything the route wrote to the log. */
const logged = () =>
  (["info", "warn", "error"] as const)
    // eslint-disable-next-line no-console -- reading what the route logged
    .flatMap((level) => vi.mocked(console[level]).mock.calls)
    .flat()
    .map(String)
    .join("\n");

describe("POST /api/auth-email", () => {
  it("sends a verification code through Resend, from the site's address, with the event id as idempotency key", async () => {
    const network = stubNetwork();
    const response = await POST(webhook(otpEvent()));

    expect(response.status).toBe(204);
    expect(network.resendCalls()).toHaveLength(1);
    const [{ init }] = network.resendCalls();
    const headers = new Headers(init?.headers);
    const sent = JSON.parse(String(init?.body));

    expect(init?.method).toBe("POST");
    expect(headers.get("authorization")).toBe("Bearer re_test_key");
    expect(headers.get("idempotency-key")).toBe("neon-auth/550e8400-e29b-41d4-a716-446655440000");
    expect(sent).toMatchObject({
      from: "Taylor's Secret Garden <noreply@taylorssecretgarden.com>",
      to: ["member@example.com"],
      reply_to: "contact@taylorssecretgarden.com",
      subject: "Confirm your email address",
    });
    expect(sent.html).toContain(">123456</span>");
    expect(sent.html).toContain("Hi Jane Smith,");
    expect(sent.text).toContain("This code works for 5 minutes.");
  });

  it("sends a password reset link, with the link Neon Auth gave and its hour", async () => {
    const network = stubNetwork();
    const event = linkEvent();

    expect((await POST(webhook(event))).status).toBe(204);
    const sent = JSON.parse(String(network.resendCalls()[0].init?.body));

    expect(sent.subject).toBe("Choose a new password");
    expect(sent.text).toContain(`Choose a new password: ${event.event_data.link_url}`);
    expect(sent.text).toContain("This link works for 1 hour, and only once.");
    expect(new Headers(network.resendCalls()[0].init?.headers).get("idempotency-key")).toBe(`neon-auth/${event.event_id}`);
  });

  it("sends a retry under the same idempotency key, with the same body", async () => {
    const network = stubNetwork();

    await POST(webhook(otpEvent()));
    await POST(webhook(otpEvent(), { headers: { "x-neon-delivery-attempt": "2" } }));
    const [first, second] = network.resendCalls();

    expect(new Headers(second.init?.headers).get("idempotency-key")).toBe(new Headers(first.init?.headers).get("idempotency-key"));
    expect(second.init?.body).toBe(first.init?.body);
  });

  it("refuses an unsigned call, a forged one and a tampered one with a bare 401, and sends nothing", async () => {
    const network = stubNetwork();
    const signed = webhook(otpEvent());
    const tampered = new Request(signed.url, { method: "POST", headers: signed.headers, body: JSON.stringify(otpEvent({ otp_code: "000000" })) });
    const forged = webhook(otpEvent(), { headers: { "x-neon-signature-kid": "not-neons" } });

    for (const request of [webhook(otpEvent(), { sign: false }), forged, tampered]) {
      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe("");
    }
    expect(network.resendCalls()).toEqual([]);
    expect(deferred).toEqual([]);
  });

  it("refuses a replayed call (an old timestamp, signed)", async () => {
    const network = stubNetwork();
    const body = JSON.stringify(otpEvent());
    const request = new Request("https://www.taylorssecretgarden.com/api/auth-email", {
      method: "POST",
      headers: signedHeaders(body, { timestamp: Date.now() - 6 * 60_000 }),
      body,
    });

    expect((await POST(request)).status).toBe(401);
    expect(network.resendCalls()).toEqual([]);
  });

  it("answers 502 when Resend fails, so Neon Auth tries again, and tells the owner without the address or code", async () => {
    stubNetwork({ status: 500, body: { name: "internal_server_error", message: "member@example.com failed" } });

    expect((await POST(webhook(otpEvent()))).status).toBe(502);
    expect(deferred).toHaveLength(1);
    await deferred[0]();
    const all = logged();

    expect(all).toContain("Account emails: one did not go out");
    expect(all).toContain("internal_server_error");
    for (const secret of ["member@example.com", "123456", "Jane"]) expect(all).not.toContain(secret);
  });

  it("answers 503 without RESEND_API_KEY, after checking the signature", async () => {
    const network = stubNetwork();

    vi.stubEnv("RESEND_API_KEY", "");
    expect((await POST(webhook(otpEvent(), { sign: false }))).status).toBe(401);
    expect((await POST(webhook(otpEvent()))).status).toBe(503);
    expect(network.resendCalls()).toEqual([]);
    expect(logged()).toContain("RESEND_API_KEY is not set");
  });

  it("answers 503 without NEON_AUTH_BASE_URL: no signature can be checked", async () => {
    stubNetwork();
    vi.stubEnv("NEON_AUTH_BASE_URL", "");

    expect((await POST(webhook(otpEvent()))).status).toBe(503);
  });

  it("acknowledges an event it sends no email for, and sends nothing", async () => {
    const network = stubNetwork();

    expect((await POST(webhook({ ...otpEvent(), event_type: "user.created", event_data: {} }))).status).toBe(204);
    expect(network.resendCalls()).toEqual([]);
  });

  it("refuses for good (422) a signed payload it cannot read, and tells the owner which fields, not their values", async () => {
    const network = stubNetwork();
    const event = otpEvent({ otp_type: "carrier-pigeon" });

    expect((await POST(webhook(event))).status).toBe(422);
    expect(network.resendCalls()).toEqual([]);
    expect(deferred).toHaveLength(1);
    await deferred[0]();
    expect(logged()).toContain("event_data.otp_type");
    expect(logged()).not.toContain("carrier-pigeon");
  });

  it("never logs the address, the name, the code or the link", async () => {
    stubNetwork();

    await POST(webhook(otpEvent()));
    await POST(webhook(linkEvent()));
    const all = logged();

    expect(all).toContain("Account email sent (email-verification code)");
    for (const secret of ["member@example.com", "Jane Smith", "123456", "tok3n", "neonauth.example/neondb/auth/reset"]) expect(all).not.toContain(secret);
  });
});

describe("handleAuthEmailWebhook", () => {
  it("passes alerts to the caller instead of sending them itself", async () => {
    stubNetwork({ status: 403, body: { name: "validation_error" } });
    const alerts: OwnerAlert[] = [];

    const response = await handleAuthEmailWebhook(webhook(linkEvent()), { alert: (alert) => alerts.push(alert) });

    expect(response.status).toBe(502);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].body).toContain("forget-password link");
    expect(alerts[0].body).toContain("403 `validation_error`");
    expect(alerts[0].body).not.toContain("member@example.com");
  });
});
