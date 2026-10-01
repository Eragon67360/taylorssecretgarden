import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

// The seed scripts themselves, run as the owner would: they must refuse
// before connecting to anything. (The guard's logic: tests/unit/guard.test.ts.)
const DEV_BRANCH = {
  DATABASE_URL: "postgresql://user:pw@ep-dev-branch-1-pooler.c-1.us-east-1.aws.neon.tech/neondb?sslmode=require",
  NEON_AUTH_BASE_URL: "https://ep-dev-branch-1.neonauth.c-1.us-east-1.aws.neon.tech/neondb/auth",
  NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
};

function run(script: string, env: Record<string, string>) {
  // Only PATH from this process: no DATABASE_URL, no .env.local (the scripts load it only if it exists; --env-file wins below).
  return spawnSync(process.execPath, ["--import", "tsx", "--conditions=react-server", script], {
    // Exactly these variables (Next's types insist every environment has NODE_ENV; these tests choose).
    env: { PATH: process.env.PATH ?? "", ...env } as unknown as NodeJS.ProcessEnv,
    encoding: "utf8",
    timeout: 30_000,
  });
}

describe.each(["scripts/seed.ts", "scripts/unseed.ts"])("%s", (script) => {
  it("refuses with NODE_ENV=production, even on a development branch", () => {
    const result = run(script, { ...DEV_BRANCH, NODE_ENV: "production" });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Refusing to (un)?seed: .*NODE_ENV=production/);
  });

  it("refuses with VERCEL_ENV=production", () => {
    const result = run(script, { ...DEV_BRANCH, VERCEL_ENV: "production" });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/VERCEL_ENV=production/);
  });

  it("refuses without a Neon branch to write to", () => {
    const result = run(script, { DATABASE_URL: "postgres://localhost:5432/postgres" });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Refusing to (un)?seed/);
  });
});
