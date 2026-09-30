# Roadmap: overnight session 2026-09-30

Two workstreams: **Swiftter** (a real social feed: replies, reshares, pagination, stored moderation decisions) and **visibility foundations** (SEO, GEO, accessibility) for www.taylorssecretgarden.com. Written before any feature code; progress is logged in `SESSION-LOG.md`, and the owner's summary is `WAKE-UP-REPORT.md`.

## What the scan found

| Topic | Finding |
| --- | --- |
| Framework | Next.js 16.3 App Router (Turbopack), React 19.3, TypeScript 6, ESLint 9 flat config, Tailwind 4, `motion`. Node 24. |
| Database | Neon Postgres (project `small-truth-26004702`, Neon's free plan, in the eragon67360 Vercel team), Drizzle ORM over node-postgres. SQL migrations in `drizzle/`, applied by hand with `npm run db:migrate`. |
| Auth | Neon Auth (managed Better Auth), email + password and Google, our own forms. `getSessionUser()` reads the signed session cookie server-side; `/api/auth/[...path]` proxies to Neon Auth behind Vercel BotID (ADR-0004, ADR-0005). |
| AI Gateway binding | `service/moderation.ts` calls AI SDK 7 `generateText` with the model string `anthropic/claude-haiku-4.5`; on Vercel the Gateway authenticates with the deployment's OIDC token (no key in the repo or in Vercel env vars); locally `AI_GATEWAY_API_KEY` or a pulled `VERCEL_OIDC_TOKEN`. Structured output, temperature 0, 8 s timeout, `maxRetries: 0`. A deterministic fake (`SWIFTTER_MODERATION=fake`, never honoured on Vercel) serves CI. No other wrapper, no second provider. |
| Tests | Playwright black-box suite (+ axe, WCAG 2.1 AA) over the production build; signed-in tests only on a disposable Neon branch (`e2e/member.ts` write guard). **No unit-test runner.** |
| CI | GitHub Actions `ci.yml`: `smoke` (lint, typecheck, build, Playwright on a fresh Neon branch per run) and `lighthouse` (LHCI mobile, a11y ≥ 0.9 fails). `releases.yml` weekly. Vercel builds previews and production from Git. |
| Deployment | Vercel project `taylorssecretgarden` in the Le Bon Tempérament team (Pro). Production = `main`; the `dev` branch has its own preview URL. |
| Domain | **www.taylorssecretgarden.com serves this same Next.js app in production** (apex 308 → www), so the domain is the public surface of the whole site, Swiftter included (`/swiftter`), not a separate site. It is live and indexable today, but the code's canonical/OG base is still `taylorssecretgarden.vercel.app`. |
| Data | Production DB: 1 real Member, 4 demo Members, 10 demo Posts (`is_demo`, shown on the live site). Until tonight previews shared the production database. |
| SEO/GEO | Per-page titles/descriptions and an OG image exist. **No robots.txt, no sitemap, no llms.txt, no canonical tags, no JSON-LD.** Skip link exists. |

## Owner decisions taken before starting (asked, answered)

1. The merge `dev` → `main` is allowed tonight under the brief's conditions (including release PR #59).
2. Test data lives on a **separate Neon branch `dev`** (created tonight; previews and local development now point at it; production keeps its own database).
3. Moderation decisions are **stored**; refused and pending notes are visible to their author only (supersedes ADR-0006's "nothing stored").
4. The canonical address becomes **https://www.taylorssecretgarden.com**.

## Moderation coverage

Moderated on write, server-side: **Post bodies and reply bodies**. Reshares carry no text of their own, so there is nothing to moderate (the original was moderated). **Not moderated tonight: display names** (set at sign-up by Neon Auth, outside our write routes; P2) and bios (the product has none).

## Data model (after the schema debate, see SESSION-LOG.md)

- **Replies stay in `posts`** (a reply is a rich-text message with the same sanitising, moderation, tear-up and limits): `parent_id` (what it answers) and `root_id` (the thread's first Post). A stored generated column `thread_id = coalesce(root_id, id)` with a composite foreign key `(parent_id, root_id) → posts(id, thread_id)` lets the database enforce that a reply sits in its parent's thread.
- **Reshares get their own table** `reshares(member_id, post_id, created_at, deleted_at, is_seed)`, unique per (Member, Post). They carry no text, so they are neither moderated nor tombstones. Self-reshare and resharing a non-public Post are refused by the insert statement itself. Undoing a reshare soft-deletes it, and resharing again restores the same row, so undo/redo cannot bump it to the top of the feed or dodge the reshare limit.
- **Publishing fails closed in the schema:** `posts.status` defaults to `pending` (existing rows are backfilled `approved`) and `posts.published_at` stays null until a Post is approved. Only rows with `published_at` set are public, and the feed sorts by it, so a Post approved late isn't buried behind cursors readers have already passed.
- **Every moderation decision is appended** to `moderation_decisions(post_id, outcome, category, reason, model, created_at)`, so the history is auditable and reversible. Tearing a Post up erases its reasons along with its text.
- **Deleting always tombstones** (text and reasons erased, `deleted_at` set). A best-effort purge later removes tombstones that nothing references once they are past the posting-limit window. Threads and reshares of a torn-up Post render "torn up".
- **`is_seed`** on `members`, `posts` and `reshares` marks test fixtures, and only the dev-branch seed writes it. `is_demo` keeps its meaning: the fictional demo content the owner chose to show on the live site, which `npm run db:unseed` removes. They are separate because their lifecycles differ: fixtures must never reach production, and the demo content lives there.
- Counts (replies, reshares) are computed at read time in the feed query, never stored, so concurrent writes cannot drift them.

## Auth and write-route rules (after the auth debate)

- **One wrapper for every write route** (`memberWrite`): non-GET only; same-origin requests only (`Origin` / `Sec-Fetch-Site`, against CSRF on the custom domain); JSON bodies only; the session checked server-side (401 without one, **503 when Neon Auth itself errors** instead of a false "signed out"); Vercel BotID. The BotID route list includes every write route.
- **Ownership in the SQL `WHERE`** (404 when it isn't yours, so existence is not revealed); replies and reshares only on a **public** Post (published, not torn up), else 404.
- **Limits per kind, all counted in Postgres under the per-Member lock:** Posts 5 / 10 min (unchanged), replies 10 / 10 min, reshares 10 / 10 min (soft-deleted ones still count), "check again" at most 3 per note.
- **The public feed is identical for every visitor** (no per-viewer fields); "you reshared this" comes from a separate, session-only, `no-store` endpoint.
- **Existing bug fixed:** `redirect_url` on the guestbook pages is an open redirect (`/\t/evil.example` survives the check); it is resolved against the site's origin and must stay same-origin.
- **Seed users** are real Neon Auth accounts on the `dev` branch (signed up through Neon Auth's API), with one documented, obviously fake password, as the brief asks. Previews sit behind Vercel Authentication, so the password is not usable by the public. Unseed removes exactly the seed's own accounts (a fixed list, not any `@seed.invalid` address) from the dev branch's `neon_auth` schema: a deliberate, guarded exception to ADR-0004's "nothing writes `neon_auth` except through /api/auth", recorded as such.
- **Known and accepted:** Neon Auth's SDK trusts its signed session cookie for up to 5 minutes, so a revoked session can still write for that long.

## Backlog

Estimates are rough working time. P0 = must ship for anything to ship; P1 = should ship tonight; P2 = next session.

### Swiftter

| # | P | Item | Est. | Acceptance criterion |
| --- | --- | --- | --- | --- |
| S1 | P0 | Additive, reversible migration: replies, reshares, stored moderation, seed marker | 1 h | `0002` applies and its `down` SQL reverts it cleanly on a Neon branch; existing rows keep their meaning. |
| S2 | P0 | Moderation on every write, decisions stored, fail-closed with a pending state | 2 h | Allowed → public; refused → stored `blocked` (author only, 422); no verdict → stored `pending` (author only, 202); never a 500 or a lost note; hermetic tests for happy, blocked, timeout, error, malformed. |
| S3 | P0 | Replies: threaded, nested, on a Post page | 2.5 h | Reply via UI and API; nested thread renders (deep threads flattened visually); reply count accurate under concurrent writes. |
| S4 | P0 | Reshares with attribution | 2 h | Reshare/undo via UI and API; resharing a reshare reshares the original; self-reshare and duplicates refused cleanly; a reshare of a torn-up Post renders a tombstone. |
| S5 | P0 | Paginated feed | 1.5 h | Keyset pagination, deterministic and stable order, "load more"; the feed query count is constant per page (N+1 test on a seeded feed). |
| S6 | P0 | Delete own Post, reply or reshare | 1 h | Own content only (403/404 proof test); tombstones keep threads and reshares readable. |
| S7 | P0 | Seed and unseed scripts with a production guard | 2 h | `scripts/seed.ts` idempotent and deterministic; `scripts/unseed.ts --dry-run` counts match; both refuse production (tested). |
| S8 | P0 | Unit + integration test runner | 1 h | Vitest runs in CI; moderation, sanitising, limits and guards unit-tested; DB integration tests run against the CI Neon branch. |
| S9 | P0 | Edge cases | 1.5 h | 0 / max / max+1 length, whitespace-only, unicode/emoji/RTL, XSS escaping, unauthenticated access, authorization, rate limits per kind, all tested. |
| S10 | P1 | Automatic re-check of pending notes | 1 h | Vercel Cron re-moderates pending notes with capped attempts and backoff; an alert-level log when a note stays pending over an hour. |
| S11 | P1 | Live Gateway smoke on seed content | 0.5 h | `npm run moderation:check` run against the real Gateway with fandom and evasion samples; results recorded (never in CI). |
| S12 | P2 | Display-name moderation | 1 h | Names checked when a Member first posts; refused names replaced by a neutral fallback. |

### Visibility foundations (SEO, GEO, accessibility)

| # | P | Item | Est. | Acceptance criterion |
| --- | --- | --- | --- | --- |
| V1 | P0 | Canonical domain | 0.5 h | Metadata base, canonical tags, OG, llms.txt and sitemap use `https://www.taylorssecretgarden.com`. DNS untouched. **The `vercel.app` → `.com` redirect is deferred (blocker B1):** Neon Auth does not trust the .com yet, and adding it is a write outside this repo/GitHub/Vercel that was refused tonight, so redirecting would break sign-in. |
| V2 | P0 | robots.txt, generated sitemap, noindex outside production | 1 h | Production robots allows and lists the sitemap; previews answer `X-Robots-Tag: noindex` and disallow all; the sitemap never lists seed or non-public content (tested). |
| V3 | P0 | Per-route metadata | 1 h | Every route has title, description, canonical, OG + Twitter card; Post pages too. |
| V4 | P0 | JSON-LD | 1 h | WebSite (home), MusicAlbum / MusicEvent-type data where it fits, DiscussionForumPosting on Post pages; valid JSON, checked in tests. |
| V5 | P0 | llms.txt | 0.5 h | `/llms.txt` generated from the catalogue, tours and site config. |
| V6 | P0 | WCAG 2.2 AA gate | 1.5 h | axe runs with WCAG 2.2 AA tags in CI and passes on every route, Swiftter's new states included (pending, blocked, error announced, not colour-only, keyboard reachable); one h1 per page checked. |
| V7 | P0 | Measured before/after | 0.5 h | Lighthouse (LHCI) and axe results recorded with the command, on a seeded environment. |
| V8 | P1 | SEO-STRATEGY.md | 1 h | Topic clusters, content architecture, internal linking plan, pre-launch checklist, prioritised backlog; no invented numbers. |
| V9 | P2 | Answer-first content blocks | 2 h | Short factual intros on Music and Tours, internal links between Albums, Eras and Tours. |

## Order of work

S1 → S8 → S2 → S5 → S3 → S4 → S6 → S7 → S9 (Swiftter, on the main thread), with V1–V8 delegated to a subagent on its own branch and reviewed, tested and merged by me. S10, S11 after the P0 set. Every item: feature branch → PR into `dev` → CI green → merge → `SESSION-LOG.md` entry.
