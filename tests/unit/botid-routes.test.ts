import { describe, expect, it } from "vitest";

import { isBotIdProtected } from "@/lib/botid-routes";

describe("BotID's routes", () => {
  it("guard deleting one's account, but not reading one's own data", () => {
    expect(isBotIdProtected("DELETE", "/api/swiftter/me")).toBe(true);
    expect(isBotIdProtected("GET", "/api/swiftter/me")).toBe(false);
    expect(isBotIdProtected("GET", "/api/swiftter/me/export")).toBe(false);
  });

  it("still guard every Swiftter write and signing up or in", () => {
    expect(isBotIdProtected("POST", "/api/swiftter/posts")).toBe(true);
    expect(isBotIdProtected("DELETE", "/api/swiftter/posts/abc")).toBe(true);
    expect(isBotIdProtected("POST", "/api/swiftter/posts/abc/report")).toBe(true);
    expect(isBotIdProtected("POST", "/api/swiftter/posts/abc/appeal")).toBe(true);
    expect(isBotIdProtected("POST", "/api/auth/sign-up/email")).toBe(true);
    expect(isBotIdProtected("GET", "/api/swiftter/posts")).toBe(false);
  });

  it("guard the requests that make Neon Auth send an email, not the ones that use what it sent", () => {
    expect(isBotIdProtected("POST", "/api/auth/request-password-reset")).toBe(true);
    expect(isBotIdProtected("POST", "/api/auth/send-verification-email")).toBe(true);
    expect(isBotIdProtected("POST", "/api/auth/reset-password")).toBe(false);
    expect(isBotIdProtected("POST", "/api/auth/email-otp/verify-email")).toBe(false);
  });
});
