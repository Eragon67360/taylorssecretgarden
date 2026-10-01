import { defineConfig } from "drizzle-kit";

// `npm run db:generate` writes a new SQL migration to drizzle/ after a change
// to db/schema.ts. Applying migrations is `npm run db:migrate` (db/migrate.ts).
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  // Only Swiftter's own tables. Neon Auth keeps the Members' accounts in the
  // `neon_auth` schema of the same database, which drizzle-kit must never touch.
  schemaFilter: ["public"],
});
