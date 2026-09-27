import { defineConfig, devices } from "@playwright/test";

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
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 2 : undefined,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
	use: {
		baseURL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: process.env.CI ? `npx next start -p ${PORT}` : `npm run build && npx next start -p ${PORT}`,
		url: baseURL,
		timeout: 300_000,
		reuseExistingServer: !process.env.CI,
	},
});
