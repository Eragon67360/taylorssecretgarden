import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UNVERIFIED_REFUSAL } from "@/lib/auth/email-verification";

// memberWrite's email check (#82), with Neon Auth's session and BotID stubbed.
const session = vi.hoisted(() => ({
  cached: null as null | { id: string; emailVerified: boolean },
  fresh: null as null | { id: string; emailVerified: boolean },
}));

vi.mock("@/lib/auth/server", () => ({
  AuthUnavailableError: class extends Error {},
  getSessionUser: vi.fn(async ({ fresh = false } = {}) => (fresh ? session.fresh : session.cached)),
}));
vi.mock("@/lib/bot-protection", () => ({ isBot: async () => false }));

const { memberWrite } = await import("@/lib/member-write");
const { getSessionUser } = await import("@/lib/auth/server");

const request = () => new Request("https://site.test/api/swiftter/posts", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
const ok = async () => new Response(null, { status: 204 });

beforeEach(() => {
  vi.mocked(getSessionUser).mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("memberWrite and confirmed email addresses", () => {
  it("lets an unconfirmed Member write while REQUIRE_EMAIL_VERIFICATION is off", async () => {
    session.cached = { id: "u", emailVerified: false };

    expect((await memberWrite(request(), ok)).status).toBe(204);
    expect(getSessionUser).toHaveBeenCalledTimes(1);
  });

  it("refuses an unconfirmed Member once it is on, after asking Neon Auth afresh", async () => {
    vi.stubEnv("REQUIRE_EMAIL_VERIFICATION", "true");
    session.cached = { id: "u", emailVerified: false };
    session.fresh = { id: "u", emailVerified: false };
    const response = await memberWrite(request(), ok);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: UNVERIFIED_REFUSAL });
    expect(getSessionUser).toHaveBeenLastCalledWith({ fresh: true });
  });

  it("lets through a Member who confirmed elsewhere, though the cookie's copy still says otherwise", async () => {
    vi.stubEnv("REQUIRE_EMAIL_VERIFICATION", "true");
    session.cached = { id: "u", emailVerified: false };
    session.fresh = { id: "u", emailVerified: true };

    expect((await memberWrite(request(), ok)).status).toBe(204);
  });

  it("does not ask again for a confirmed Member", async () => {
    vi.stubEnv("REQUIRE_EMAIL_VERIFICATION", "true");
    session.cached = { id: "u", emailVerified: true };

    expect((await memberWrite(request(), ok)).status).toBe(204);
    expect(getSessionUser).toHaveBeenCalledTimes(1);
  });

  it("never stops an unconfirmed Member taking their words back or leaving", async () => {
    vi.stubEnv("REQUIRE_EMAIL_VERIFICATION", "true");
    session.cached = { id: "u", emailVerified: false };
    const remove = new Request("https://site.test/api/swiftter/me", { method: "DELETE" });

    expect((await memberWrite(remove, ok, { body: false, verifiedEmail: false })).status).toBe(204);
  });
});
