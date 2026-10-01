import { describe, expect, it } from "vitest";

import { safeRedirect } from "@/lib/safe-redirect";

describe("safeRedirect", () => {
  it.each(["/swiftter", "/swiftter/p/5d1c0a3e-0001-4a6f-9c1e-5d1c0a3e0001", "/music?album=52612062", "/tours#wall"])(
    "keeps the path on this site %s",
    (path) => {
      expect(safeRedirect(path, "/fallback")).toBe(path);
    },
  );

  it.each([
    ["a tab", "/\t/evil.example"],
    ["a newline", "/\n/evil.example"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash", "/\\evil.example"],
    ["an absolute URL", "https://evil.example/swiftter"],
    ["javascript:", "javascript:alert(1)"],
    ["a relative path", "swiftter"],
    ["nothing", ""],
  ])("falls back on %s", (_, target) => {
    expect(safeRedirect(target, "/fallback")).toBe("/fallback");
  });

  it("falls back when there is no target", () => {
    expect(safeRedirect(undefined, "/fallback")).toBe("/fallback");
    expect(safeRedirect(null, "/fallback")).toBe("/fallback");
  });
});
