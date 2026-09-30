/* eslint-disable no-console -- command-line script: its output is the report */
// Summarises a Playwright JSON report (playwright-results.json, written in CI
// by playwright.config.ts) for the run's summary page: how many tests passed,
// failed, were skipped, and which were flaky, that is, failed and then passed
// on their retry. CI keeps one retry so an outside hiccup (Neon Auth, a cold
// branch) does not block a release, which also hides flakes: this makes them
// visible, in the summary and as a warning on the pull request, without
// failing the run.
//
// Usage: npx tsx scripts/playwright-summary.ts [report.json]
//   appends to $GITHUB_STEP_SUMMARY when set, and prints one `::warning`
//   annotation per flaky test.
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";

type Test = { projectName: string; status: "expected" | "unexpected" | "flaky" | "skipped" };
type Spec = { title: string; file: string; line: number; tests: Test[] };
type Suite = { title: string; specs?: Spec[]; suites?: Suite[] };
export type Report = { suites: Suite[]; stats: { expected: number; unexpected: number; flaky: number; skipped: number } };

export type Flaky = { title: string; file: string; line: number };

/** Every test that passed only on a retry, with where it is. */
export function flakyTests(report: Report): Flaky[] {
	const flaky: Flaky[] = [];
	const walk = (suite: Suite, path: string[]) => {
		const titles = suite.title ? [...path, suite.title] : path;

		for (const spec of suite.specs ?? []) {
			if (spec.tests.some((test) => test.status === "flaky")) flaky.push({ title: [...titles.slice(1), spec.title].join(" › "), file: spec.file, line: spec.line });
		}
		for (const child of suite.suites ?? []) walk(child, titles);
	};

	for (const suite of report.suites) walk(suite, []);

	return flaky;
}

/** The Markdown for the run summary. */
export function summary(report: Report): string {
	const { expected, unexpected, flaky, skipped } = report.stats;
	const lines = ["### Playwright", "", "| Passed | Flaky | Failed | Skipped |", "| --- | --- | --- | --- |", `| ${expected} | ${flaky} | ${unexpected} | ${skipped} |`];
	const tests = flakyTests(report);

	if (tests.length > 0) {
		lines.push("", "Flaky (failed, then passed on the retry):", "");
		for (const test of tests) lines.push(`- \`${test.file}:${test.line}\` ${test.title}`);
	}

	return `${lines.join("\n")}\n`;
}

/** One GitHub annotation per flaky test: `%`, CR and LF escaped as the runner expects. */
export const annotations = (report: Report) =>
	flakyTests(report).map((test) => {
		const message = `Flaky: ${test.title}`.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");

		return `::warning file=e2e/${test.file},line=${test.line},title=Flaky test::${message}`;
	});

// Run as a script (not imported by the unit tests).
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
	const report = JSON.parse(readFileSync(process.argv[2] ?? "playwright-results.json", "utf8")) as Report;
	const markdown = summary(report);

	if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
	else console.log(markdown);
	for (const line of annotations(report)) console.log(line);
}
