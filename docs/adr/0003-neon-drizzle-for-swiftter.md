# Swiftter data on Neon Postgres with Drizzle; Clerk owns identity

> **Partly superseded** by [ADR-0004](0004-neon-auth-replaces-clerk.md): identity moved from Clerk to Neon Auth. The data decisions below (Neon Postgres, Drizzle, migrations in the repo, Members upserted on their first authenticated request, no webhook sync) still stand.

The original Supabase project was deleted after the free tier paused it, taking every Member and Post with it. Swiftter now stores its data in Neon Postgres provisioned through the Vercel Marketplace (free tier scales to zero but does not delete), accessed with Drizzle, schema migrations in the repo. Supabase's auth was never used (Clerk is the only identity provider), so nothing of Supabase is kept. Members are keyed by their Clerk user id and upserted server-side on first authenticated request; every write route checks the Clerk session. No webhook sync: not worth a signing secret and endpoint for a portfolio site.
