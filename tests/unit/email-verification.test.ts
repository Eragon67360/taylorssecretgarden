import { describe, expect, it } from "vitest";

import { isEmailVerificationRequired } from "@/lib/auth/email-verification";

// Off unless the owner turns it on (after Neon Auth's "Verify at sign-up").
describe("REQUIRE_EMAIL_VERIFICATION", () => {
  it.each([
    [undefined, false],
    ["", false],
    ["false", false],
    ["0", false],
    ["yes", false],
    ["true", true],
    [" TRUE ", true],
  ])("%j → %s", (value, required) => {
    expect(isEmailVerificationRequired({ REQUIRE_EMAIL_VERIFICATION: value })).toBe(required);
  });
});
