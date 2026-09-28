import { test as base, expect } from "@playwright/test";

/**
 * Console messages that are known, harmless noise. Every entry must say why
 * it is allowed; anything else logged as an error or warning fails the test.
 * Warnings are included on purpose: hydration and next/image problems surface
 * as warnings, and Clerk's notice below is one.
 */
const ALLOWED_CONSOLE_MESSAGES: { pattern: RegExp; reason: string }[] = [
	{
		pattern: /Clerk has been loaded with development keys/,
		reason: "The site runs on Clerk development keys during Phase A (see #6); Clerk warns about it on every page.",
	},
	{
		pattern: /^The resource http:\/\/localhost:\d+\/_next\/static\/chunks\/[\w-]+\.css was preloaded using link preload but not used/,
		reason:
			"Next prefetches the routes the nav links to, stylesheets included (e.g. Home's Era faces); Chrome warns when the visitor stays put for a few seconds instead of going there.",
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

				if (ALLOWED_CONSOLE_MESSAGES.some(({ pattern }) => pattern.test(text))) return;
				problems.push(`console.${message.type()}: ${text}`);
			});

			await use(problems);

			expect(problems, "page errors / console errors").toEqual([]);
		},
		{ auto: true },
	],
});

export { expect };
