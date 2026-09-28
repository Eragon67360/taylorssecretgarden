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
export function connectionString(url = process.env.DATABASE_URL): string {
	if (!url) throw new Error("DATABASE_URL is not set: Swiftter needs a Postgres database.");

	const parsed = new URL(url);
	const sslmode = parsed.searchParams.get("sslmode");

	if (sslmode === "prefer" || sslmode === "require" || sslmode === "verify-ca") {
		parsed.searchParams.set("sslmode", "verify-full");
	}

	return parsed.toString();
}

export function createPool(url?: string) {
	return new Pool({ connectionString: connectionString(url), max: 5 });
}

// Created on first use, not at import, so `next build` needs no database. Kept
// on globalThis so dev-server hot reloads reuse one pool.
const globalForDb = globalThis as typeof globalThis & { swiftterDb?: Database };

export function getDb(): Database {
	globalForDb.swiftterDb ??= drizzle(createPool(), { schema });

	return globalForDb.swiftterDb;
}
