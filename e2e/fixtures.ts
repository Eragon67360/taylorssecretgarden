import { test as base, expect } from "@playwright/test";

/**
 * Console messages that are known, harmless noise. Every entry must say why
 * it is allowed; anything else logged as an error or warning fails the test.
 */
const ALLOWED_CONSOLE_ERRORS: { pattern: RegExp; reason: string }[] = [
	{
		pattern: /Clerk has been loaded with development keys/,
		reason: "The site runs on Clerk development keys during Phase A (see #6); Clerk warns about it on every page.",
	},
];

type Fixtures = {
	/** Uncaught page errors and console errors/warnings seen during the test. */
	pageProblems: string[];
};

/**
 * Every test fails on uncaught page errors and on console errors or warnings
 * that are not in the allow-list above.
 */
export const test = base.extend<Fixtures>({
	pageProblems: [
		async ({ page }, use) => {
			const problems: string[] = [];

			page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
			page.on("console", (message) => {
				if (message.type() !== "error" && message.type() !== "warning") return;
				const text = message.text();

				if (ALLOWED_CONSOLE_ERRORS.some(({ pattern }) => pattern.test(text))) return;
				problems.push(`console.${message.type()}: ${text}`);
			});

			await use(problems);

			expect(problems, "page errors / console errors").toEqual([]);
		},
		{ auto: true },
	],
});

export { expect };
