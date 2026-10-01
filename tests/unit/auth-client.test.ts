import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AUTH_PROXY_ROUTES } from "@/lib/auth/proxy-routes";

// The browser half of Neon Auth (lib/auth/client.ts, lib/auth/member-hint.ts)
// against a stubbed window and fetch. Both modules keep page-lifetime state,
// so each test loads them afresh.
type Call = { method: string; url: string; body?: unknown };

let calls: Call[];
let answer: (call: Call) => Response | Promise<Response>;
let location: { href: string; search: string };
let replaced: string[];

const json = (body: unknown, status = 200) => Response.json(body, { status });
const member = { id: "u1", name: "Tay", email: "tay@example.com" };

beforeEach(() => {
  vi.resetModules();
  calls = [];
  replaced = [];
  answer = () => json(null);
  location = { href: "https://site.test/swiftter", search: "" };
  vi.stubGlobal("window", {
    get location() {
      return location;
    },
  });
  vi.stubGlobal("history", {
    state: null,
    replaceState: (_state: unknown, _title: string, url: string) => replaced.push(url),
  });
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const call = { method: init?.method ?? "GET", url, body: init?.body ? JSON.parse(String(init.body)) : undefined };

    calls.push(call);

    return answer(call);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const load = async () => ({ hint: await import("@/lib/auth/member-hint"), client: await import("@/lib/auth/client") });

describe("the session, asked once per page", () => {
  it("makes one get-session request however many ask, and returns the user", async () => {
    answer = () => json({ session: { id: "s" }, user: member });
    const { hint } = await load();

    const [a, b, maybe] = await Promise.all([hint.getSessionMember(), hint.getSessionMember(), hint.mayBeMember()]);

    expect(await hint.getSessionMember()).toEqual(member);
    expect([a, b, maybe]).toEqual([member, member, true]);
    expect(hint.currentMember()).toEqual(member);
    expect(calls).toEqual([{ method: "GET", url: "/api/auth/get-session" }]);
  });

  it("answers null for a visitor, once", async () => {
    const { hint } = await load();

    expect(await hint.mayBeMember()).toBe(false);
    expect(await hint.getSessionMember()).toBeNull();
    expect(calls).toHaveLength(1);
  });

  it("does not remember a failure: the next ask tries again", async () => {
    answer = () => json({ code: "INTERNAL_ERROR" }, 502);
    const { hint } = await load();

    expect(await hint.getSessionMember()).toBeNull();
    expect(hint.currentMember()).toBeNull();
    answer = () => json({ session: { id: "s" }, user: member });
    expect(await hint.getSessionMember()).toEqual(member);
    expect(calls).toHaveLength(2);
  });

  it("completes a Google sign-in: sends the verifier along, then drops it from the address", async () => {
    location = { href: "https://site.test/swiftter/p/1?neon_auth_session_verifier=v%2B1&x=2", search: "?neon_auth_session_verifier=v%2B1&x=2" };
    answer = () => json({ session: { id: "s" }, user: member });
    const { hint } = await load();

    expect(await hint.getSessionMember()).toEqual(member);
    expect(calls[0].url).toBe("/api/auth/get-session?neon_auth_session_verifier=v%2B1");
    expect(replaced).toEqual(["https://site.test/swiftter/p/1?x=2"]);
  });

  it("lets a sign-in that finishes first win over an older session answer", async () => {
    let release: (response: Response) => void = () => {};

    answer = () => new Promise((resolve) => (release = resolve));
    const { hint } = await load();
    const listener = vi.fn();

    hint.subscribeMember(listener);
    const asked = hint.getSessionMember();

    hint.setSessionMember(member);
    release(json(null));

    expect(await asked).toEqual(member);
    expect(hint.currentMember()).toEqual(member);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("signing up, in and out", () => {
  it("only calls endpoints the proxy forwards", async () => {
    answer = (call) => (call.url.endsWith("social") ? json({ url: "https://accounts.google.com/o", redirect: true }) : json({ user: member }));
    const { client, hint } = await load();

    await hint.getSessionMember();
    await client.signUpEmail({ name: "Tay", email: "tay@example.com", password: "long-enough" });
    await client.signInEmail({ email: "tay@example.com", password: "long-enough" });
    await client.signInSocial({ provider: "google", callbackURL: "https://site.test/swiftter", errorCallbackURL: "https://site.test/sign-in" });
    await client.signOut();

    for (const { method, url } of calls) {
      expect(AUTH_PROXY_ROUTES[method], `${method} ${url}`).toContain(new URL(url, "https://site.test").pathname.replace("/api/auth/", ""));
    }
  });

  it("records the Member on sign-in and forgets them on sign-out, telling listeners", async () => {
    answer = (call) => (call.url.endsWith("sign-out") ? json({ success: true }) : json({ token: "t", user: member }));
    const { client, hint } = await load();
    const listener = vi.fn();

    hint.subscribeMember(listener);
    expect(await client.signInEmail({ email: "tay@example.com", password: "pw" })).toEqual({ data: { token: "t", user: member }, error: null });
    expect(hint.currentMember()).toEqual(member);
    await client.signOut();
    expect(hint.currentMember()).toBeNull();
    expect(await hint.getSessionMember()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(calls.map((call) => call.url)).toEqual(["/api/auth/sign-in/email", "/api/auth/sign-out"]);
  });

  it("reports Neon Auth's refusal with its code, message and status", async () => {
    answer = () => json({ code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" }, 401);
    const { client, hint } = await load();

    expect(await client.signInEmail({ email: "tay@example.com", password: "wrong" })).toEqual({
      data: null,
      error: { status: 401, code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" },
    });
    expect(hint.currentMember()).toBeUndefined();
  });

  it("reports an unreachable guestbook as status 0", async () => {
    answer = () => Promise.reject(new TypeError("Failed to fetch"));
    const { client } = await load();

    expect(await client.signUpEmail({ name: "Tay", email: "tay@example.com", password: "long-enough" })).toEqual({ data: null, error: { status: 0 } });
  });

  it("sends the browser to Google's address", async () => {
    answer = () => json({ url: "https://accounts.google.com/o/oauth2/auth?x=1", redirect: true });
    const { client } = await load();
    const input = {
      provider: "google",
      callbackURL: "https://site.test/swiftter",
      errorCallbackURL: "https://site.test/sign-in?redirect_url=%2Fswiftter",
    } as const;

    expect((await client.signInSocial(input)).error).toBeNull();
    expect(calls[0].body).toEqual(input);
    expect(location.href).toBe("https://accounts.google.com/o/oauth2/auth?x=1");
  });

  it.each(["javascript:alert(1)", "data:text/html,hi", "not a url"])("never navigates to %s", async (url) => {
    answer = () => json({ url, redirect: true });
    const { client } = await load();

    expect((await client.signInSocial({ provider: "google", callbackURL: "/", errorCallbackURL: "/" })).error).not.toBeNull();
    expect(location.href).toBe("https://site.test/swiftter");
  });
});
