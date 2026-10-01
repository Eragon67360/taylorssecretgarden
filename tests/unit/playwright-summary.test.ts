import { describe, expect, it } from "vitest";

import { type Report, annotations, flakyTests, summary } from "@/scripts/playwright-summary";

// The shape of Playwright's JSON reporter, trimmed to what the summary reads.
const report: Report = {
  stats: { expected: 3, unexpected: 1, flaky: 1, skipped: 1 },
  suites: [
    {
      title: "swiftter.spec.ts",
      specs: [],
      suites: [
        {
          title: "Swiftter, signed out",
          specs: [
            { title: "the feed route is public", file: "swiftter.spec.ts", line: 160, tests: [{ projectName: "chromium", status: "expected" }] },
            { title: "older notes load 100% of a page", file: "swiftter.spec.ts", line: 207, tests: [{ projectName: "chromium", status: "flaky" }] },
          ],
        },
      ],
    },
    {
      title: "music.spec.ts",
      specs: [
        { title: "lists every Album", file: "music.spec.ts", line: 12, tests: [{ projectName: "chromium", status: "unexpected" }] },
        { title: "opens a Version", file: "music.spec.ts", line: 30, tests: [{ projectName: "chromium", status: "skipped" }] },
      ],
    },
  ],
};

describe("the Playwright summary", () => {
  it("finds the tests that passed only on their retry, with their describe block", () => {
    expect(flakyTests(report)).toEqual([{ title: "Swiftter, signed out › older notes load 100% of a page", file: "swiftter.spec.ts", line: 207 }]);
  });

  it("counts every outcome and lists the flaky tests", () => {
    const markdown = summary(report);

    expect(markdown).toContain("| 3 | 1 | 1 | 1 |");
    expect(markdown).toContain("- `swiftter.spec.ts:207` Swiftter, signed out › older notes load 100% of a page");
  });

  it("says nothing about flakes when there are none", () => {
    expect(summary({ stats: { expected: 2, unexpected: 0, flaky: 0, skipped: 0 }, suites: [] })).not.toContain("Flaky (");
  });

  it("annotates each flaky test as a warning on its line, escaping what the runner reads", () => {
    expect(annotations(report)).toEqual([
      "::warning file=e2e/swiftter.spec.ts,line=207,title=Flaky test::Flaky: Swiftter, signed out › older notes load 100%25 of a page",
    ]);
  });
});
