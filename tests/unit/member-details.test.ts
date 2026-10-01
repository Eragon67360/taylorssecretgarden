import { describe, expect, it } from "vitest";

import { allowedAvatarUrl } from "@/lib/avatar";
import { displayNameOf, MAX_NAME_LENGTH, truncateGraphemes } from "@/lib/display-name";
import { memberFromAuthUser } from "@/service/swiftter";

// What Swiftter keeps of a Neon Auth user: names and pictures arrive as the
// person (or Google) gave them, so they are checked on the server.

const GOOGLE_PHOTO = "https://lh3.googleusercontent.com/a/ACg8ocJ1bXq4Zexample=s96-c";

describe("memberFromAuthUser", () => {
  it("cuts a long name to 80 graphemes", () => {
    const member = memberFromAuthUser({ id: "u1", name: "Taylor ".repeat(40), email: "t@example.com" });

    expect(member.displayName).toHaveLength(MAX_NAME_LENGTH);
    expect(member.displayName).toBe("Taylor ".repeat(40).slice(0, MAX_NAME_LENGTH));
  });

  it("counts an emoji or an accented letter as one character, and never splits one", () => {
    const family = "👨‍👩‍👧‍👦";
    const member = memberFromAuthUser({ id: "u1", name: family.repeat(100), email: "t@example.com" });

    expect(member.displayName).toBe(family.repeat(MAX_NAME_LENGTH));
  });

  it("keeps a Google account photo", () => {
    expect(memberFromAuthUser({ id: "u1", email: "t@example.com", image: GOOGLE_PHOTO }).avatarUrl).toBe(GOOGLE_PHOTO);
  });

  it.each([
    ["another host", "https://evil.example/a/photo.png"],
    ["a Clerk avatar", "https://img.clerk.com/eyJ0eXBlIjoicHJveHkifQ"],
    ["another lh3 path", "https://lh3.googleusercontent.com/pw/AP1Gcz-any-picture"],
    ["plain http", "http://lh3.googleusercontent.com/a/ACg8oc"],
    ["a port", "https://lh3.googleusercontent.com:8443/a/ACg8oc"],
    ["a look-alike host", "https://lh3.googleusercontent.com.evil.example/a/ACg8oc"],
    ["a path climbing out of /a/", "https://lh3.googleusercontent.com/a/../pw/AP1Gcz"],
    ["not a URL", "javascript:alert(1)"],
  ])("drops %s", (_, image) => {
    expect(memberFromAuthUser({ id: "u1", email: "t@example.com", image }).avatarUrl).toBeNull();
  });
});

describe("allowedAvatarUrl", () => {
  it("allows Google account photo paths, old and new", () => {
    expect(allowedAvatarUrl(GOOGLE_PHOTO)).toBe(GOOGLE_PHOTO);
    expect(allowedAvatarUrl("https://lh3.googleusercontent.com/a-/AOh14Gexample")).toBe("https://lh3.googleusercontent.com/a-/AOh14Gexample");
  });

  it("is null for no picture or the bare /a/ folder", () => {
    expect(allowedAvatarUrl(null)).toBeNull();
    expect(allowedAvatarUrl("")).toBeNull();
    expect(allowedAvatarUrl("https://lh3.googleusercontent.com/a/")).toBeNull();
  });
});

describe("displayNameOf / truncateGraphemes", () => {
  it("falls back to the email's local part, then Swiftie", () => {
    expect(displayNameOf({ name: "  ", email: "meredith@example.com" })).toBe("meredith");
    expect(displayNameOf({ email: "@example.com" })).toBe("Swiftie");
  });

  it("leaves short text alone", () => {
    expect(truncateGraphemes("Inès 🎶", 80)).toBe("Inès 🎶");
  });
});
