import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const PORT = Number(process.env.PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

// Smoke suite: drives the running app as a black box (pages + HTTP routes).
// Locally `npm run test:e2e` builds and starts a production server; in CI the
// workflow builds in its own step, so the web server only starts it.
export default defineConfig({
	testDir: "./e2e",
	globalSetup: "./e2e/global-setup.ts",
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
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: isCI ? `npx next start -p ${PORT}` : `npm run build && npx next start -p ${PORT}`,
		url: baseURL,
		timeout: 300_000,
		reuseExistingServer: !isCI,
		// Serves the development styleguide (/styleguide) from the production build.
		env: { ENABLE_STYLEGUIDE: "1" },
	},
});
