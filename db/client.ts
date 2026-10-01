import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

/**
 * The connection string from DATABASE_URL, with a weak `sslmode` spelled out.
 *
 * Neon's URLs say `sslmode=require`, which node-postgres already treats as
 * `verify-full` but warns about on every connection. Asking for `verify-full`
 * explicitly keeps the same (strict) behaviour without the warning. URLs with
 * no `sslmode` (the plain Postgres in CI) are left alone.
 */
export function connectionString(): string {
  const url = process.env.DATABASE_URL;

  if (!url) throw new Error("DATABASE_URL is not set: Swiftter needs a Postgres database.");

  const parsed = new URL(url);
  const sslmode = parsed.searchParams.get("sslmode");

  if (sslmode === "prefer" || sslmode === "require" || sslmode === "verify-ca") {
    parsed.searchParams.set("sslmode", "verify-full");
  }

  return parsed.toString();
}

/*
  A pool of at most 5 connections. On Vercel's Fluid Compute one function
  instance serves many requests at once and is suspended when idle:

  - idleTimeoutMillis 5 s: a connection nobody has used for 5 seconds is
    closed. attachDatabasePool (getDb) keeps the instance up that long after
    each query so this can happen before it is suspended; short, then, because
    that wait is billed, and under load connections are reused well within it.
    A new one costs a TLS handshake to Neon's pooler, which keeps the database
    side warm.
  - connectionTimeoutMillis 10 s: waiting for a connection gives up after 10
    seconds rather than for ever (pg's default), which covers Neon waking a
    compute from zero (usually under a second, a few at worst) and turns a
    real outage into an error well inside the function's time limit.

  Scripts (migrate, seed, unseed) create their own pool and end it; the idle
  timeout also lets a script's process exit if one ever forgets.
*/
export function createPool() {
  return new Pool({ connectionString: connectionString(), max: 5, idleTimeoutMillis: 5_000, connectionTimeoutMillis: 10_000 });
}

// Created on first use, not at import, so `next build` needs no database. Kept
// on globalThis so dev-server hot reloads reuse one pool.
const globalForDb = globalThis as typeof globalThis & { swiftterDb?: Database };

export function getDb(): Database {
  if (!globalForDb.swiftterDb) {
    const pool = createPool();

    // On Vercel, after each query, keeps the instance alive (waitUntil) for
    // the idle timeout, so idle connections are closed rather than frozen
    // open while it is suspended. Outside Vercel (VERCEL_URL and
    // VERCEL_REGION unset: next start, tests) it does nothing.
    attachDatabasePool(pool);
    globalForDb.swiftterDb = drizzle(pool, { schema });
  }

  return globalForDb.swiftterDb;
}
