# Session log: overnight session 2026-09-30

One line per roadmap item (timestamp UTC, item, outcome, commit), plus the design debates the brief requires. See `ROADMAP.md` for the items and `WAKE-UP-REPORT.md` for the summary.

## Setup

- 2026-09-30T00:03Z · infra · Neon branch `dev` (br-round-darkness-b7qiopg9) created from production, with its own Neon Auth; Vercel `DATABASE_URL` and `NEON_AUTH_BASE_URL` split: production keeps the production branch, Preview + Development now use `dev` · no commit (outside the repo)
- 2026-09-30T00:10Z · infra · Adding the .com to production Neon Auth's trusted domains: **refused by the session's permission policy** (write outside repo/GitHub/Vercel) · blocker B1

## Debates

**Schema.** Proposal: everything in `posts` (replies, reshares, moderation columns, default `approved`). Opponent: reshares are not content; a default of `approved` fails open; tombstone purge would break threads; a rollback would leak replies and refused notes. **Opponent won on reshares, moderation and deletion** (own `reshares` table, append-only `moderation_decisions`, `status` defaulting to `pending` + `published_at`, always tombstone and best-effort purge); **the proposal kept replies in `posts`** (they share everything with Posts), read-time counts and the single keyset query.

**Moderation failure mode.** Proposal: fail-closed with a stored pending state. Opponent argued fail-open (an outage silences the whole community; no moderators to release stuck notes). **Fail-closed won**: fail-open cannot meet "moderated before public" at all, and anyone who can make the model return no verdict would get exactly the worst content published. Conditions adopted from the opponent: capped retries with a final state, a real scheduler, sort by approval time, approvals that cannot resurrect torn-up notes.

## Items
