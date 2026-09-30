import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { endpointOf, isProductionEndpoint, seedGuard, writeGuard } from "@/db/guard";

// A made-up endpoint standing in for production, with its hash: the real
// production endpoint's hash lives in db/guard.ts.
const PRODUCTION_EP = "ep-prod-example-123456";
const PRODUCTION = createHash("sha256").update(PRODUCTION_EP).digest("hex");

const branch = (endpoint: string) => ({
	DATABASE_URL: `postgresql://user:pw@${endpoint}-pooler.c-1.us-east-1.aws.neon.tech/neondb?sslmode=require`,
	NEON_AUTH_BASE_URL: `https://${endpoint}.neonauth.c-1.us-east-1.aws.neon.tech/neondb/auth`,
	NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
});

describe("endpointOf", () => {
	it("reads the Neon endpoint from database and auth URLs, pooled or not", () => {
		expect(endpointOf(branch("ep-cool-name-1").DATABASE_URL)).toBe("ep-cool-name-1");
		expect(endpointOf(branch("ep-cool-name-1").NEON_AUTH_BASE_URL)).toBe("ep-cool-name-1");
		expect(endpointOf("postgres://localhost:5432/db")).toBeNull();
		expect(endpointOf("not a url")).toBeNull();
	});
});

describe("writeGuard", () => {
	it("allows a disposable branch", () => {
		expect(writeGuard(branch("ep-disposable-1"), PRODUCTION)).toBeNull();
	});

	it("refuses the production branch", () => {
		expect(writeGuard(branch(PRODUCTION_EP), PRODUCTION)).toMatch(/production/);
		expect(isProductionEndpoint(branch(PRODUCTION_EP).DATABASE_URL, PRODUCTION)).toBe(true);
	});

	it("refuses missing settings, non-Neon URLs and database/auth on different branches", () => {
		expect(writeGuard({}, PRODUCTION)).toMatch(/Needs/);
		expect(writeGuard({ ...branch("ep-a-1"), DATABASE_URL: "postgres://localhost/db" }, PRODUCTION)).toMatch(/must point at a Neon branch/);
		expect(writeGuard({ ...branch("ep-a-1"), NEON_AUTH_BASE_URL: branch("ep-b-2").NEON_AUTH_BASE_URL }, PRODUCTION)).toMatch(/different/);
	});
});

describe("seedGuard", () => {
	it("allows a development branch", () => {
		expect(seedGuard(branch("ep-dev-1"), PRODUCTION)).toBeNull();
	});

	it("refuses NODE_ENV=production and VERCEL_ENV=production, even on a development branch", () => {
		expect(seedGuard({ ...branch("ep-dev-1"), NODE_ENV: "production" }, PRODUCTION)).toMatch(/NODE_ENV=production/);
		expect(seedGuard({ ...branch("ep-dev-1"), VERCEL_ENV: "production" }, PRODUCTION)).toMatch(/VERCEL_ENV=production/);
	});

	it("refuses the production database", () => {
		expect(seedGuard(branch(PRODUCTION_EP), PRODUCTION)).toMatch(/production/);
	});
});
