import { test as base, expect } from "@playwright/test";

/**
 * Console messages that are known, harmless noise. Every entry must say why
 * it is allowed; anything else logged as an error or warning fails the test.
 * Warnings are included on purpose: hydration and next/image problems surface
 * as warnings.
 */
const ALLOWED_CONSOLE_MESSAGES: { pattern: RegExp; reason: string }[] = [];

type Fixtures = {
  /**
   * Console messages a test provokes on purpose (e.g. the browser logging a
   * refused sign-in's 401), set with `test.use` next to the tests that expect them.
   */
  expectedConsoleMessages: RegExp[];
  /** Uncaught page errors and console errors/warnings seen during the test. */
  pageProblems: string[];
};

/**
 * Every test fails on uncaught page errors and on console errors or warnings
 * that are not in the allow-list above (or expected by the test).
 */
export const test = base.extend<Fixtures>({
  expectedConsoleMessages: [[], { option: true }],
  pageProblems: [
    async ({ page, expectedConsoleMessages }, use) => {
      const problems: string[] = [];

      page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() !== "error" && message.type() !== "warning") return;
        const text = message.text();

        if (ALLOWED_CONSOLE_MESSAGES.some(({ pattern }) => pattern.test(text))) return;
        if (expectedConsoleMessages.some((pattern) => pattern.test(text))) return;
        problems.push(`console.${message.type()}: ${text}`);
      });

      await use(problems);

      expect(problems, "page errors / console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
