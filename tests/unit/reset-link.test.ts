import { describe, expect, it } from "vitest";

import { siteResetLink } from "@/lib/auth/reset-link";

const BASE = "https://ep-autumn-union-b7nub2bh.neonauth.c-13.us-east-1.aws.neon.tech/neondb/auth";
const neonLink = (token: string, callback = "https://www.taylorssecretgarden.com/reset-password") =>
  `${BASE}/reset-password/${token}?callbackURL=${encodeURIComponent(callback)}`;

describe("siteResetLink", () => {
  it("points Neon Auth's reset link at the site's own page, with the same token", () => {
    expect(siteResetLink(neonLink("5ILj2CXedlnnDfCq582t1tk2"), BASE)).toBe("https://www.taylorssecretgarden.com/reset-password?token=5ILj2CXedlnnDfCq582t1tk2");
  });

  it("keeps the apex domain when that is where the reset was asked from", () => {
    expect(siteResetLink(neonLink("abcDEF123_-x", "https://taylorssecretgarden.com/reset-password"), BASE)).toBe(
      "https://taylorssecretgarden.com/reset-password?token=abcDEF123_-x",
    );
  });

  it.each([
    ["another host", neonLink("abcdefgh").replace("ep-autumn-union-b7nub2bh", "ep-other")],
    ["another path", `${BASE}/verify-email/abcdefgh?callbackURL=${encodeURIComponent("https://www.taylorssecretgarden.com/reset-password")}`],
    ["a callback on another site", neonLink("abcdefgh", "https://evil.example/reset-password")],
    ["a callback to another page", neonLink("abcdefgh", "https://www.taylorssecretgarden.com/swiftter")],
    ["no callback", `${BASE}/reset-password/abcdefgh`],
    ["a token with odd characters", neonLink("abc%2F..%2Fdef")],
    ["a nested path", `${BASE}/reset-password/abc/def?callbackURL=${encodeURIComponent("https://www.taylorssecretgarden.com/reset-password")}`],
    ["not a URL", "not a url"],
  ])("keeps the link unchanged for %s", (_, link) => {
    expect(siteResetLink(link, BASE)).toBe(link);
  });
});
