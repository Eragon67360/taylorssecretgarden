# Wake-up report: overnight session 2026-09-30

Scope: Swiftter as a real social feed, and the visibility foundations (SEO, GEO, accessibility) for www.taylorssecretgarden.com. Plan: [ROADMAP.md](ROADMAP.md). Minute-by-minute: [SESSION-LOG.md](SESSION-LOG.md).

## 1. TL;DR

- **Nothing was merged to `main`.** Production is unchanged at `3cfcfe6`. Everything below is on `dev` (CI green at `6f6b3cc`), waiting on release PR [#59](https://github.com/Eragon67360/taylorssecretgarden/pull/59). The reason is in section 7: the brief's checklist line 11 could not be shown on a Vercel deployment.
- **Swiftter is now a social feed** (on `dev`): threaded replies with a page per thread, reshares with credit, a paginated feed, "tear up" for your own notes, and AI moderation on every Post and reply. Moderation decisions are stored and fail closed with a visible "pending" state.
- **Visibility foundations** (on `dev`):
  - the `.com` is the canonical address everywhere;
  - `robots.txt`, a generated sitemap and `/llms.txt`;
  - JSON-LD on Home, Music, the Tours and threads;
  - every non-production deployment is noindex;
  - the accessibility gate is now WCAG 2.2 AA; `SEO-STRATEGY.md` holds the plan.
- **Test data lives on a new Neon branch `dev`.** Previews and local development point at it, and production data is never touched. Seed and unseed are one command each, and both refuse production.
- **Two security items need you first** (section 7):
  - B2: the production database password appeared in this session's local output. Rotate it.
  - B1: the `.com` isn't trusted by Neon Auth, so sign-in on www.taylorssecretgarden.com fails today.

## 2. SHIPPED

**On `main`: nothing** (`main` = `3cfcfe6`, unchanged). **On `dev`** (squash-merged, each with CI green):

| PR | What | Commit on `dev` |
| --- | --- | --- |
| [#63](https://github.com/Eragon67360/taylorssecretgarden/pull/63) | ROADMAP.md and SESSION-LOG.md, committed before any feature code | `1a5fa08` |
| [#64](https://github.com/Eragon67360/taylorssecretgarden/pull/64) | Vitest unit tests; moderation tested against a mocked Gateway; the shared write/seed guard | `5b1772b` |
| [#66](https://github.com/Eragon67360/taylorssecretgarden/pull/66) | The social feed: replies, reshares, pagination, stored fail-closed moderation, seed/unseed, write-route protections, integration and e2e tests, ADR-0007 | `b28b401` |
| [#67](https://github.com/Eragon67360/taylorssecretgarden/pull/67) | Live moderation check with fan-discourse and evasion samples; larger tear-up target | `f3c0861` |
| [#65](https://github.com/Eragon67360/taylorssecretgarden/pull/65) | Visibility foundations (canonical, robots, sitemap incl. threads, noindex, metadata, JSON-LD, llms.txt, WCAG 2.2 gate, SEO-STRATEGY.md) | `6f6b3cc` |

These also ride along to `main`, from before tonight: #56–#62 (BotID and posting limit, AI moderation, tear-up, album versions, CI fixes).

What a person can now do on the `dev` preview (https://taylorssecretgarden-git-dev-le-bon-temperament.vercel.app, behind Vercel login):
- read threads at `/swiftter/p/<id>`;
- reply under any note;
- reshare and undo;
- load older notes;
- see their own "waiting for a check" and "not passed" notes, with the reason and "check again";
- tear up their own notes (threads and reshares then show them as torn up).

## 3. CI STATUS

| Pipeline | State | Link |
| --- | --- | --- |
| CI (`ci.yml`) on `dev` @ `6f6b3cc`: **smoke** (lint, typecheck, unit, integration, build, Playwright) | ✅ success | [run 36656254605](https://github.com/Eragon67360/taylorssecretgarden/actions/runs/36656254605) |
| CI on `dev` @ `6f6b3cc`: **lighthouse** | ✅ success | same run |
| CI on release PR #59 (`dev` → `main`) | runs on each `dev` push; the latest `dev` commit carries this report | [#59 checks](https://github.com/Eragon67360/taylorssecretgarden/pull/59/checks) |
| Release check (`releases.yml`, weekly) | never run: scheduled workflows only run from `main` | — |
| Vercel preview of `dev` | ✅ READY at `b28b401`, and rebuilt on each `dev` push | https://taylorssecretgarden-git-dev-le-bon-temperament.vercel.app |
| Vercel production | unchanged (`main`) | https://www.taylorssecretgarden.com |

One CI job failed once tonight at "Create a Neon branch" with a 422 from Neon. Overlapping runs exceeded the free plan's branch limit (each run uses 2 branches; `main`, `dev` and an older `a40-dev-neon-auth` hold 3 more). A re-run passed. See section 9.

## 4. MEASURED RESULTS

Only numbers produced by a tool tonight.

**Lighthouse** (Lighthouse CI in the `lighthouse` CI job, `npm run lighthouse` = `lhci autorun`, mobile emulation, median of 3 runs; downloaded from the job's `lighthouse-reports` artifact):

| Page | Before (`dev` 65056da, run 36644950703) perf / a11y | After (`dev` 6f6b3cc, run 36656254605) perf / a11y |
| --- | --- | --- |
| `/` | 0.89 / 1 | 0.89 / 1 |
| `/music` | 0.87 / 1 | 0.87 / 1 |
| `/tours` | 0.89 / 1 | 0.88 / 1 |
| `/tours/the-eras-tour` | 0.91 / 1 | 0.92 / 1 |
| `/swiftter` | 0.93 / 1 | 0.93 / 1 |
| `/sign-in` | not audited | 0.90 / 1 |
| `/swiftter/p/<seeded thread>` (8 replies deep) | did not exist | 0.92 / 1 |

Both runs audited a seeded database (CI loads the demo content and, since tonight, the fixtures). Performance below 0.9 is a warning in this config, not a failure.

**axe:** 17 `expectNoAxeViolations` call sites in the Playwright suite, several in loops (every Era palette on Music, every Tour page). They run with WCAG 2.2 AA tags (`wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`). All pass in CI run 36656254605: 0 violations. Tonight's checks found and fixed two real contrast/target problems:
- sonner's "rich" success toast failed contrast;
- the tear-up button was below 24 px.

**Tests** (CI run 36656254605, `dev` 6f6b3cc):
- `npm test`: 53 passed (5 files).
- `npm run test:integration`: 17 passed.
- `npm run test:e2e`: 275 passed.

**Coverage** (`vitest run --coverage`, v8, scope `service/`, `lib/`, `db/`, `app/api/`, run locally against the `dev` branch): unit and integration together, 70 tests, **38.08% statements, 39.45% branches, 37.5% functions, 39.13% lines**. Unit only: 9.56% statements. Route handlers and pages are covered by the Playwright suite, which this tool does not measure.

**N+1:** an integration test pages through a seeded feed of 45+ Posts with a query-counting executor. **Exactly 1 SQL query per page.**

**Live moderation** (`npm run moderation:check`, real AI Gateway, `anthropic/claude-haiku-4.5`, Development OIDC token): **25/25 as expected.** Baseline 11/11, fan discourse 9/9, evasion 5/5. Latency median 1318 ms, max 2342 ms. The first call in the end-to-end run below took 4014 ms (cold).

**End-to-end with the real Gateway:** the production build, run locally on the `dev` database with no fake moderation (Playwright script):
- sign-in 200;
- a normal note 201 approved (4014 ms);
- an off-topic note 422 refused (2838 ms), shown in the author's held notes;
- a reply 201;
- reshare and undo 204/201.

**Not measured:** Core Web Vitals on production, PageSpeed Insights, any search or traffic data (the site has none and none is claimed).

## 5. MODERATION

- **Coverage:** every new Post and every reply, judged server-side on write. Reshares carry no text and aren't moderated (the original was). Display names are **not** moderated tonight (P2). The product has no bios.
- **Placement:** only the server decides, and every write route goes through `lib/member-write.ts`. Tests prove that a direct API call can't publish unmoderated or refused content (422 and not in the public feed, 404 on its page).
- **Decision model:** `posts.status` (pending, approved, blocked) plus `published_at`. Every attempt is appended to `moderation_decisions` with outcome, category, reason, model and duration. Auditable and reversible by hand.
- **Failure mode: fail-closed with a stored pending state.** Chosen after a debate against fail-open (section 8).
  - A note with no verdict (timeout, error, malformed answer) is kept pending and shown only to its author, with "check again".
  - A Vercel Cron job (every 15 minutes, `vercel.json`, `CRON_SECRET` created in Production) re-checks with backoff, at most 4 attempts in all.
  - A note pending for over an hour logs `ALERT`.
  - Never a 500, never a lost note: the note is stored before it is judged.
- **Timeout budget:** 8 s per attempt, `maxRetries: 0`.
- **Observed latency:** see section 4 (median 1.3 s; first cold call 4.0 s).
- **False-positive risk on fan discourse:**
  - Tonight's 9 fan-discourse samples all passed: "she MURDERED that surprise song", "I would literally kill for floor seats", swearing for emphasis, harsh criticism of the albums, emoji only, Arabic.
  - The policy says "when in doubt, allow". Nine samples is not a guarantee.
  - Lyric quotation was tested with song titles only, deliberately, to keep lyrics out of the repo.
- **Evasion:**
  - Before the model sees a note, Unicode compatibility forms are folded (full-width and styled letters) and invisible and bidi characters are removed.
  - Leetspeak, spaced letters, Cyrillic look-alikes, zero-width and full-width insults were all caught live (5/5).
  - **Known limits:** look-alike letters from other scripts are not folded in code (the model catches them, so far). The model can be wrong. Novel obfuscation isn't guaranteed to be caught.
- **Privacy:** logs carry the refusal category only, never the note's text or the model's reason. Reasons are stored in the database and erased when a note is torn up.
- **Hermetic tests:** unit tests use the AI SDK's `MockLanguageModelV4`. They cover allowed, both refusals, timeout, Gateway error, three malformed answers, prompt injection, unicode and normalisation. CI never calls the Gateway.

## 6. SEED DATA

- **Where:** the Neon branch `dev` only (`br-round-darkness-b7qiopg9`), which Preview and Development now use. CI loads the same fixtures on its throwaway branches. Production has none.
- **What:**
  - 6 accounts (real Neon Auth accounts);
  - 53 Posts over three feed pages: the shortest (one emoji), the longest (1000 characters), unicode, emoji, right-to-left;
  - 14 replies: an 8-level thread, a wide thread, a refused reply;
  - 5 reshares, one of a Post torn up since;
  - notes in every moderation state (approved, refused as unkind, refused as off-topic, pending);
  - one account that never writes, and one with an 85-character name.
  - Every name and text is fictional or original.
- **Marker:** `is_seed = true` on every row (`members`, `posts`, `reshares`). Accounts are matched by their exact addresses from `scripts/seed-data.ts`, never by the domain alone.
- **Test logins** (any of them): `wren@seed.invalid`, `dario@seed.invalid`, `noor@seed.invalid`, `sunny@seed.invalid`, `quiet@seed.invalid`, `long@seed.invalid`. Password `seed-password-not-for-production`. Previews are behind Vercel Authentication.
- **Remove it all with one command:** `npm run unseed`, with `.env.local` pulled for Development first (`npx vercel env pull .env.local --environment=development --scope le-bon-temperament --project taylorssecretgarden`). With production's `.env.local` it refuses, which is the point.
- **Dry run verified:**
  - `npm run unseed -- --dry-run` reported 6 members, 53 Posts, 14 replies, 5 reshares, 67 decisions and 6 accounts, exactly what the seed created.
  - The real unseed then removed all of it (0 of each), and the seed was reloaded.
  - A second seed run creates nothing (idempotent).
  - The foreign-key path was tested: a real reply under a seed thread keeps 9 seed notes as tombstones instead of failing.
- **Guard tests:** `tests/unit/seed-guard.test.ts` runs both scripts with `NODE_ENV=production`, `VERCEL_ENV=production` and no Neon branch, and expects each to refuse.
- **Also cleaned:** my local test runs had left 105 throwaway `swiftter-e2e-…@example.com` accounts (205 notes, 9 reshares) on the `dev` branch. Removed.
- **Kept on `dev`:** the demo content and the one real Member account, copied from production when the branch was created.

## 7. BLOCKERS

| # | Blocked | Why | The one action from you |
| --- | --- | --- | --- |
| B2 | Nothing is blocked, but this is urgent: security | Loading an env file through the shell echoed the database URL. The `neondb_owner` password (the same on production and `dev`) appeared in this session's local tool output. It isn't in any commit, file or remote log. | Reset the `neondb_owner` password in the Neon console (project `small-truth-26004702`) on **both** branches, `production` and `dev` (the branch copied the role with the same password). Then update the Vercel variables: Production `DATABASE_URL` (plus `DATABASE_URL_UNPOOLED` / `PG*` / `POSTGRES_*`) and the Preview + Development `DATABASE_URL`. |
| B3 | The release to `main` (PR #59) | Checklist line 11 isn't met on a Vercel deployment: Vercel BotID refuses the automated browser's sign-in (403), and there's no supported BotID bypass for automation. The same flow passed locally with the real Gateway (section 4). The merge debate (section 8) also agreed not to merge. | In order: (1) B2; (2) `npm run db:migrate` with production's `.env.local`, which applies 0002 (additive; production must have it before the new code); (3) sign in on the `dev` preview in your own browser and publish one normal and one off-topic note; (4) if both behave, merge #59. To roll back later, run `drizzle/down/0002_swiftter_social.down.sql` **before** a Vercel Instant Rollback. |
| B1 | Sign-in on www.taylorssecretgarden.com, and the vercel.app → .com redirect | The .com isn't in Neon Auth's trusted domains, so sign-in there already fails (`INVALID_CALLBACKURL`). Adding it is a write outside this repo, GitHub and Vercel, which was refused tonight. | Neon console → production branch → Auth → Domains: add `https://www.taylorssecretgarden.com` and `https://taylorssecretgarden.com`. Then ask for the redirect (SEO-STRATEGY.md, pre-launch checklist). |
| B4 | Reliable CI under parallel runs | Neon's free plan caps branches. CI takes 2 per run on top of `main`, `dev` and `a40-dev-neon-auth` (expires 2026-10-04). | Pick one: let `a40-dev-neon-auth` expire and accept occasional re-runs, or move this Neon project to a plan with more branches (a cost, so your call). |

## 8. DECISIONS & DEBATES

Each design was argued against by a separate reviewer before it was built (summaries in SESSION-LOG.md).

- **Schema:**
  - The reviewer won on reshares, moderation and deletion: reshares get their own table, decisions are an append-only table, `status` defaults to `pending` with `published_at` (fail-closed in the schema itself), and deletion always tombstones.
  - Replies stayed in `posts`, with a database-enforced thread key, and counts are computed when read.
- **Moderation failure mode:**
  - Fail-closed with a pending state won against fail-open. Fail-open can't satisfy "moderated before public", and anyone able to make the model give no verdict would get exactly the worst content published.
  - The reviewer's conditions were adopted: capped retries, a real scheduler, sorting by approval time, verdicts that can't bring back torn-up notes.
- **Auth:**
  - The reviewer found an existing open redirect (fixed and tested), a limit bypass through reshares and "check again" (closed with per-kind limits), writes to hidden notes (now 404), and no CSRF check (all writes now require same-origin and JSON).
  - Kept: Neon Auth, ownership checked in SQL with a 404, no sign-in-only pages, and the brief's shared test password.
- **Merge to `main`:** even arguing for merging, the reviewer agreed not to merge: line 11 isn't demonstrated, the production migration and password rotation must come first, and rollback needs the down script first.
- **Other calls:**
  - `is_seed` is separate from `is_demo`. The demo content is shown on the live site on purpose; fixtures must never reach it.
  - The public feed is identical for every visitor. Per-viewer data comes from a private endpoint.
  - A visitor's "am I signed in?" is answered locally when there is no Neon Auth cookie. Before, every visitor shared one Neon Auth rate limit, which made CI flaky and would have throttled sign-ins under real traffic.
  - The canonical address is `https://www.taylorssecretgarden.com` (your choice). Nothing touches DNS.

## 9. KNOWN GAPS & RISKS

- **Not verified on a Vercel deployment:** a signed-in write, because BotID blocks automation (B3). The feed and pages are verified on the preview (noindex header checked).
- **Production needs migration 0002 before the new code;** migrations are manual. Code older than 0002 would show replies and held notes as ordinary Posts, so run the down script before any rollback past it.
- **Sessions:** Neon Auth's SDK trusts its signed session cookie for up to 5 minutes, so a revoked session can still write for that long.
- **Moderation:**
  - Display names aren't moderated.
  - There is no human review screen. Reversing a decision is an SQL update, documented in ADR-0007.
  - After 4 attempts a note stays pending until its author tears it up.
- **The cron runs on production only** (Vercel's rule). Previews re-check only through "check again".
- **Performance:** Lighthouse is below 0.9 on `/music` (0.87) and `/tours` (0.88). It was the same before tonight, and it only warns in CI.
- **Coverage** is 38% by the unit/integration tool (section 4). Most UI paths are covered by e2e only.
- **CI capacity:** overlapping runs can hit Neon's branch cap (B4).
- **Search engines:**
  - Canonical tags already point at the .com while sign-in there fails (B1). Search engines are unaffected, but people landing on the .com can't sign in.
  - The Open Graph image URL lost its cache-busting query (the visibility agent's note).
- **Dev data:** the `dev` branch holds a copy of production's one real Member account (from branching). Test runs against `dev` create throwaway accounts, which must be cleaned by hand (done tonight). CI uses throwaway branches.
- **Local-only limit:** Deezer's image CDN refuses this machine, so Home and Music e2e run only in CI.

## 10. NEXT SESSION

1. **B2 and B3:** rotate the database password, apply migration 0002 to production, check the preview in a real browser, merge #59, then tag the first release (`v0.1.0` was prepared as the name) with plain-language notes.
2. **B1 and the pre-launch checklist** (SEO-STRATEGY.md): trust the .com in Neon Auth, add the vercel.app → www redirect, submit the sitemap in Search Console, and check that production answers robots/noindex as expected (`lib/indexing.ts`).
3. **Moderation of display names** (S12), and a small owner-only review page for held notes (reverse a decision without SQL).
4. **Performance on Music and Tours** (0.87 and 0.88): look at the largest images and fonts on those pages with PageSpeed Insights on the preview.
5. **Answer-first content** (V9 in the roadmap): short factual intros on Music and Tours, and internal links between Albums, Eras and Tours, as planned in SEO-STRATEGY.md.
