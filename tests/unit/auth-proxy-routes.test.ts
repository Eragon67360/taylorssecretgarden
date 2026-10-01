import { describe, expect, it } from "vitest";

import { isAuthProxyRoute } from "@/lib/auth/proxy-routes";

// Segments as the catch-all route receives them: Next decodes each one, so
// `/api/auth/.%2Fsign-up/email` arrives as [".\/sign-up", "email"].
describe("isAuthProxyRoute", () => {
  it.each([
    ["GET", ["get-session"]],
    ["POST", ["sign-up", "email"]],
    ["POST", ["sign-in", "email"]],
    ["POST", ["sign-in", "social"]],
    ["POST", ["sign-out"]],
  ])("forwards %s %j, which the site uses", (method, segments) => {
    expect(isAuthProxyRoute(method, segments)).toBe(true);
  });

  it.each([
    ["an encoded ./ before the path", ["./sign-up", "email"]],
    ["an encoded x/../ before the path", ["x/../sign-up", "email"]],
    ["a dot segment", [".", "sign-up", "email"]],
    ["a dot-dot segment", ["x", "..", "sign-in", "email"]],
    ["a backslash", ["x\\..\\sign-up", "email"]],
    ["a double-encoded path", ["%2E%2Fsign-up", "email"]],
    ["a trailing segment", ["sign-up", "email", "x"]],
  ])("refuses a sign-up spelled with %s", (_, segments) => {
    expect(isAuthProxyRoute("POST", segments)).toBe(false);
  });

  // Resetting a password and confirming an email address (#118, #82).
  it.each([
    ["POST", ["request-password-reset"]],
    ["POST", ["reset-password"]],
    ["POST", ["send-verification-email"]],
    ["POST", ["email-otp", "verify-email"]],
  ])("forwards %s %j, for a forgotten password or an unconfirmed email", (method, segments) => {
    expect(isAuthProxyRoute(method, segments)).toBe(true);
  });

  it.each([
    // The link goes to Neon Auth itself, never through here.
    ["GET", ["reset-password", "a-token"]],
    ["POST", ["reset-password", "a-token"]],
    ["GET", ["reset-password"]],
    ["GET", ["request-password-reset"]],
    ["POST", ["request-password-reset", "x"]],
    // Verification is by code: no link to follow, and no other way to send or check one.
    ["GET", ["verify-email"]],
    ["POST", ["verify-email"]],
    ["GET", ["send-verification-email"]],
    ["POST", ["email-otp", "send-verification-otp"]],
    ["POST", ["email-otp", "check-verification-otp"]],
    ["POST", ["email-otp", "request-password-reset"]],
    ["POST", ["email-otp", "reset-password"]],
    ["POST", ["email-otp", "passcode"]],
    ["POST", ["email-otp", "verify-email", "x"]],
    ["GET", ["email-otp", "verify-email"]],
    ["POST", ["email-otp"]],
    ["POST", ["sign-in", "email-otp"]],
    ["POST", ["forget-password"]],
    ["POST", ["forget-password", "email-otp"]],
    ["POST", ["change-password"]],
    ["POST", ["change-email"]],
  ])("refuses %s %j, a neighbour of the reset and verification endpoints", (method, segments) => {
    expect(isAuthProxyRoute(method, segments)).toBe(false);
  });

  it.each([
    ["an encoded slash", ["email-otp/verify-email"]],
    ["an encoded ./", ["./reset-password"]],
    ["a dot-dot segment", ["x", "..", "reset-password"]],
    ["a backslash", ["email-otp\\verify-email"]],
    ["a percent", ["request-password-reset%00"]],
  ])("refuses the new endpoints spelled with %s", (_, segments) => {
    expect(isAuthProxyRoute("POST", segments)).toBe(false);
  });

  it.each([
    ["POST", ["update-user"]],
    ["POST", ["delete-user"]],
    ["POST", ["admin", "create-user"]],
    ["GET", ["admin", "list-users"]],
    ["GET", ["token", "anonymous"]],
    ["POST", ["organization", "create"]],
    ["GET", ["ok"]],
  ])("refuses %s %j, which the site does not use", (method, segments) => {
    expect(isAuthProxyRoute(method, segments)).toBe(false);
  });

  it("refuses a used path with the wrong method", () => {
    expect(isAuthProxyRoute("GET", ["sign-in", "email"])).toBe(false);
    expect(isAuthProxyRoute("DELETE", ["get-session"])).toBe(false);
    expect(isAuthProxyRoute("post", ["sign-out"])).toBe(true);
  });
});
