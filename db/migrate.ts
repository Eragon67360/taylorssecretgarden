/* eslint-disable no-console -- command-line script: its output is the report */
// Applies the SQL migrations in drizzle/ to the database at DATABASE_URL.
// Usage: npm run db:migrate
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { createPool } from "./client";

async function main() {
	const pool = createPool();

	try {
		await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
		console.log("Migrations applied.");
	} finally {
		await pool.end();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
