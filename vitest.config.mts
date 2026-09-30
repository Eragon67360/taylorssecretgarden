import path from "node:path";

import { defineConfig } from "vitest/config";

/*
  Unit and integration tests (Vitest). The Playwright suite in e2e/ drives
  the built app as a black box; these test modules directly.

  - unit: hermetic. No network, no database: AI moderation runs against the
    AI SDK's mock model, never the Gateway. `npm test`.
  - integration: against a real Postgres, only a disposable Neon branch (the
    same write guard as the e2e suite, db/guard.ts). `npm run test:integration`,
    run by CI on the branch it creates for each run.
*/
const alias = {
	"@": import.meta.dirname,
	// Next's marker module throws outside a React Server Component build.
	"server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
};

export default defineConfig({
	test: {
		projects: [
			{ resolve: { alias }, test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" } },
			{
				resolve: { alias },
				test: {
					name: "integration",
					include: ["tests/integration/**/*.test.ts"],
					environment: "node",
					// One database: files run one after another.
					fileParallelism: false,
					testTimeout: 30_000,
				},
			},
		],
		coverage: {
			provider: "v8",
			// components/music/catalogue.ts is server code too: the Music shelf and its id resolution.
			include: ["service/**", "lib/**", "db/**", "app/api/**", "components/music/catalogue.ts"],
			reporter: ["text-summary", "json-summary"],
		},
	},
});
