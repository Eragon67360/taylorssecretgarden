import { describe, expect, it } from "vitest";

import { MAX_REPORT_REASON_CHARACTERS } from "@/lib/swiftter";
import { InvalidReasonError, prepareReason } from "@/service/swiftter";

// A report's reason is kept as plain text, never rendered as HTML.
describe("a report's reason", () => {
  it("is optional: nothing, or only spaces, is no reason", () => {
    expect(prepareReason(undefined)).toBeNull();
    expect(prepareReason(null)).toBeNull();
    expect(prepareReason("  \n\t ")).toBeNull();
  });

  it("is kept as written, trimmed, tags and all (plain text, shown as text)", () => {
    expect(prepareReason("  It shares <b>someone's</b> address  ")).toBe("It shares <b>someone's</b> address");
  });

  it("loses control and invisible characters, and runs of blank lines", () => {
    expect(prepareReason("a\u0000b‮c​d\r\n\r\n\r\n\r\ne")).toBe("abcd\n\ne");
  });

  it(`holds at most ${MAX_REPORT_REASON_CHARACTERS} visible characters (an emoji counts as one)`, () => {
    expect(prepareReason("💜".repeat(MAX_REPORT_REASON_CHARACTERS))).toHaveLength(MAX_REPORT_REASON_CHARACTERS * 2);
    expect(() => prepareReason("a".repeat(MAX_REPORT_REASON_CHARACTERS + 1))).toThrow("This reason is 501 characters long; 500 is the most it can hold.");
    expect(() => prepareReason("a".repeat(10_000))).toThrow(InvalidReasonError);
  });

  it("is text, nothing else", () => {
    expect(() => prepareReason(42)).toThrow(InvalidReasonError);
    expect(() => prepareReason({ reason: "x" })).toThrow(InvalidReasonError);
  });
});
