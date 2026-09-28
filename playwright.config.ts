import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

// Locally, the tests read the same settings as the app (`next start` loads
// .env.local), so the write guard (e2e/member.ts) checks the database and auth
// the app really uses. Variables already set (CI) win.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const isCI = !!process.env.CI;
const PORT = Number(process.env.PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

// Smoke suite: drives the running app as a black box (pages + HTTP routes).
// Locally `npm run test:e2e` builds and starts a production server; in CI the
// workflow builds in its own step, so the web server only starts it.
export default defineConfig({
	testDir: "./e2e",
	timeout: 60_000,
	expect: { timeout: 15_000 },
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 1 : 0,
	workers: isCI ? 2 : undefined,
	reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
	use: {
		baseURL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [
		// Signs up this run's test Member (e2e/member.setup.ts) before anything else.
		{ name: "setup", testMatch: /member\.setup\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"] },
	],
	webServer: {
		command: isCI ? `npx next start -p ${PORT}` : `npm run build && npx next start -p ${PORT}`,
		url: baseURL,
		timeout: 300_000,
		reuseExistingServer: !isCI,
		// Serves the development styleguide (/styleguide) from the production build.
		env: { ENABLE_STYLEGUIDE: "1" },
	},
});
