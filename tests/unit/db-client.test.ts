import type { Pool } from "pg";

import { attachDatabasePool } from "@vercel/functions";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPool, getDb } from "@/db/client";

vi.mock("@vercel/functions", () => ({ attachDatabasePool: vi.fn() }));

const globalForDb = globalThis as typeof globalThis & { swiftterDb?: unknown };

// A pool connects on first query only: nothing here reaches a database.
beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgres://user:password@localhost:5432/garden");
  delete globalForDb.swiftterDb;
  vi.mocked(attachDatabasePool).mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete globalForDb.swiftterDb;
});

describe("the database pool", () => {
  it("closes idle connections after 5 s and gives up connecting after 10 s", async () => {
    const pool = createPool();

    expect(pool.options).toMatchObject({ max: 5, idleTimeoutMillis: 5_000, connectionTimeoutMillis: 10_000 });
    await pool.end();
  });

  it("is attached to the function's lifecycle once, for the app's pool only", async () => {
    const pool = createPool();

    expect(attachDatabasePool).not.toHaveBeenCalled();
    getDb();
    getDb();
    expect(attachDatabasePool).toHaveBeenCalledTimes(1);
    expect((vi.mocked(attachDatabasePool).mock.calls[0][0] as Pool).options).toMatchObject({ idleTimeoutMillis: 5_000 });
    await pool.end();
  });
});
