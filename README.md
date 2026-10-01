# Taylor's Secret Garden

A Taylor Swift fan site and portfolio piece:

- **Home**: the journal's opening spread: a taped Eras Tour photo, three ways in (Music, Tours, Swiftter), all twelve Eras pressed like flowers (each opens its Album on Music) and the Tour posters pinned to the wall.
- **Music**: all 16 Albums (every studio Album and every Taylor's Version, each in its most complete edition, curated in `lib/catalogue.ts`), with cover, tracklist, durations and label fetched live from Deezer's public API. An open Album lists its other Versions on Deezer (standard and international editions, live and acoustic albums, "Chapter" compilations), each with its own tracklist and page (`/music/folklore/the-long-pond-studio-sessions`). Every Album and Version page is prerendered and refreshed hourly from Deezer data cached for a day. Every Monday, [a workflow](.github/workflows/releases.yml) compares Deezer with the catalogue (`npm run releases:check`) and opens an issue labelled `new-release` for anything new: a new Album needs its Era added by hand (look, flower, fonts), a new Version one line in the catalogue.
- **Tours**: a vertical journal of every Tour (ticket stub, poster, footage), each linking to its own page with that Tour's facts (from `public/json/tours.json`, typed in `lib/tours.ts`).
- **Swiftter** (`/swiftter`, formerly `/forum`): a small feed where signed-in Members publish Posts. Anyone can read it; publishing needs signing the guestbook (email + password, or Google).

The domain vocabulary (Era, Album, Tour, Swiftter, Post, Member) is defined in [`CONTEXT.md`](CONTEXT.md), and design decisions are recorded in [`docs/adr/`](docs/adr/).

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack), React 19, TypeScript 6
- [Tailwind CSS 4](https://tailwindcss.com/) (CSS-first config in `styles/globals.css`); [shadcn/ui](https://ui.shadcn.com/) is configured (`components.json`, [ADR-0002](docs/adr/0002-shadcn-replaces-nextui.md)) for primitives copied into `components/ui/` when a page needs one (none does yet: the scrapbook kit covers them)
- [Neon Auth](https://neon.com/docs/auth/overview) (managed Better Auth, `@neondatabase/auth`, beta SDK pinned exactly) for sign-in, with our own guestbook forms ([ADR-0004](docs/adr/0004-neon-auth-replaces-clerk.md))
- [Neon Postgres](https://neon.com/) (via the Vercel Marketplace) with [Drizzle ORM](https://orm.drizzle.team/) for Swiftter's Members and Posts ([ADR-0003](docs/adr/0003-neon-drizzle-for-swiftter.md))
- Free-licensed concert photos from [Wikimedia Commons](https://commons.wikimedia.org/) for the home photo and the Tours, cropped into `public/img` and served through next/image; each is credited with its licence (`public/json/tours.json`, `lib/credits.ts`, `/credits`). The Eras Tour trailer is a click-to-load YouTube embed
- [Deezer API](https://developers.deezer.com/api) for the Album catalogue (no credentials needed)
- [Motion](https://motion.dev/) (`motion/react`) for the scrapbook's hover lifts and tab transitions
- [Playwright](https://playwright.dev/) with [axe](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) for the smoke tests

## Design system

The site is a fan's scrapbook (the 2026 redesign, #17), built from:

- **Journal tokens** in `styles/globals.css`: `paper`, `card`, `ink`, `soft`, `line`, `accent`, `on-accent`, `tape` as CSS variables and Tailwind colours (`bg-paper`, `text-soft`...), plus `font-hand` (Caveat), `font-body` (Karla), `font-serif` (Fraunces), `font-serif-italic` and `font-display` (the current Era's face). Caveat and Fraunces are self-hosted static cuts of the one weight the site uses (`assets/fonts/`, rebuilt with `uv run --with fonttools --with brotli python scripts/build-fonts.py`), half the size of Google's variable files.
- **Era looks** in `lib/eras.ts`: every Era's palette, flower, fan note and display face, and which Era each Album belongs to. The Eras Tour, which spans every Era, has a look of its own (`ERAS_TOUR_LOOK` in `lib/tours.ts`). `<EraScope era="…">` (`components/era-scope.tsx`) applies one by overriding the tokens on a container; the colours fade across when the Era changes. Era display faces (`config/era-fonts.ts`) are not preloaded, so a face downloads only when its Era is on screen.
- **The scrapbook kit** in `components/scrapbook/`: paper, washi tape, pin, polaroid, bracelet, pressed flowers, scribble, arrow, highlight, sticky note, rubber stamp, ticket stub, ruled list.

`/styleguide` shows the kit in several Eras and every Era's palette, and `/styleguide/emails` the account emails. It is served by `next dev`, and by a production build only with `ENABLE_STYLEGUIDE=1` (the Playwright suite and CI set it); the live site answers 404.

Deployed on Vercel: `main` is production, every branch gets a preview.

## Getting started

Requires Node 24.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

[`.env.example`](.env.example) lists every environment variable the app reads, with what each is for.

## Checks

```bash
npm run lint              # ESLint 9, flat config (eslint.config.mjs); fails on any warning
npm run format            # Prettier rewrites every file (npm run format:check only reports)
npm run typecheck         # tsc --noEmit
npm test                  # unit tests (Vitest), hermetic
npm run test:integration  # integration tests, against a disposable Neon branch only
npm run test:e2e          # Playwright smoke suite
npm run lighthouse        # Lighthouse CI on a production build (run `npm run build` first)
```

[Prettier](https://prettier.io/) formats the code, styles, JSON, YAML and Markdown ([`.prettierrc.json`](.prettierrc.json): its defaults, 160 columns; [`.prettierignore`](.prettierignore)), with 2-space indentation, and [`.editorconfig`](.editorconfig) gives editors the same settings. The reformat that introduced it is listed in [`.git-blame-ignore-revs`](.git-blame-ignore-revs); to have `git blame` skip it locally, run once:

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

`npm test` runs the unit tests (Vitest, `tests/unit/`): hermetic, no network or database. AI moderation runs against the AI SDK's mock model (`MockLanguageModelV4`): allowed, both refusals, timeout, Gateway error and malformed answers, prompt injection and unicode. The sanitiser and the database guards are covered too. `npm run test:integration` runs `tests/integration/` against a disposable Neon branch only (the same guard as below), and `npm run test:coverage` reports coverage.

`npm run test:e2e` builds the app and starts it on port 3100 (or reuses a server already listening there), then drives it as a black box: every route renders with no page errors and no console errors or warnings, the nav highlights the current page, the site chrome (and the styleguide) pass axe at WCAG 2.2 AA, fit a 390px phone and stay still under reduced motion (helpers in `e2e/checks.ts`, which each redesigned page enables for its whole route), Music loads Albums and tracklists, Tours lists every Tour and each Tour page shows its own facts, and Swiftter reads, publishes, sanitises and deletes Posts. Every page has one h1, its canonical link and link-preview cards, and `e2e/seo.spec.ts` checks what crawlers get (see [Search engines and AI assistants](#search-engines-and-ai-assistants)). The guestbook pages are checked the same way, plus their keyboard order, validation and error states.

The tests read `.env.local` like the app does. Everything that writes (signing up, signing in, publishing Posts) needs a disposable Neon branch: `DATABASE_URL` and `NEON_AUTH_BASE_URL` of the same branch, which must not be production (the guard in [`e2e/member.ts`](e2e/member.ts) compares against a hash of the production endpoint), plus `NEON_AUTH_COOKIE_SECRET`; otherwise those tests are skipped. With a branch, the `setup` project ([`e2e/member.setup.ts`](e2e/member.setup.ts)) first signs up a fresh test Member ("Swiftter Tester", a unique `@example.com` address) through the sign-up form, and the signed-in tests reuse its session (`e2e/.auth/`, git-ignored). To get a branch locally, create one from production in the Neon console (or the API), with an expiry, and put its connection string and Auth URL in `.env.local`; migrate and seed it (see [Database](#database)). The first run needs a browser: `npx playwright install chromium`.

## CI

[GitHub Actions](.github/workflows/ci.yml) runs two jobs on every pull request, each on a production build under `next start`:

- **smoke**: lint (`npm run lint` and `npm run format:check`), typecheck, unit and integration tests, build and the Playwright suite. A failed test gets one retry; the run summary counts passed, flaky (passed only on the retry), failed and skipped tests, and each flaky test is a warning on the pull request. On failure the Playwright report and traces are uploaded as an artifact.
- **lighthouse**: [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) ([`lighthouserc.js`](lighthouserc.js)) audits Home, Music, Tours, the Eras Tour page, Swiftter, the sign-in page and a seeded eight-reply thread with Lighthouse's mobile emulation, three runs each: the median run must score at least 0.9 for Accessibility (an error) and should for Performance (a warning, since shared runners swing it by up to 0.3 between runs; check it on the Vercel preview). The scores table lands in the run summary and the full reports are uploaded as an artifact.

A first job, **changes**, compares the pull request with its base (a push to `dev` with `main`): when only documentation changed (Markdown, `docs/`, `LICENSE`, `.vscode/`, `dependabot.yml`), both jobs are skipped, which still counts as passing for the required checks. One run at a time per branch: a push to `dev` and the open release pull request share one, the newer cancelling the older.

Each job creates its own Neon branch from production (database and Neon Auth URL) with the local action [`.github/actions/neon-branch`](.github/actions/neon-branch/action.yml), which wraps [`create-branch-action`](https://github.com/neondatabase/create-branch-action) (pinned by commit) and retries for up to three and a half minutes while the project is at the free plan's branch limit. It migrates and seeds the branch (so Lighthouse audits a real feed), and the job deletes it at the end, even when a step fails (it also expires after two hours). They need the `NEON_API_KEY` and `NEON_AUTH_COOKIE_SECRET` repository secrets and the `NEON_PROJECT_ID` variable; the cookie secret goes only to the steps that run the app or its write guard.

[Dependabot](.github/dependabot.yml) opens weekly update pull requests into `dev`: npm minor and patch updates as one, majors one by one (ESLint and TypeScript majors held back, [ADR-0001](docs/adr/0001-toolchain-holdbacks.md)), and the GitHub Actions.

To run Lighthouse locally, build first, then `npm run lighthouse` (it starts `next start` on port 3180; set `LHCI_PORT` to change it, and `CHROME_PATH` if Chrome is not found, e.g. Playwright's Chromium).

## Releasing

`main` is production (Vercel deploys it); everything reaches it from `dev`.

1. Work lands on `dev` through pull requests, each with CI green.
2. A release is one pull request from `dev` into `main`. If it brings migrations, run **Migrate production** on `dev` first (see [Database](#database)).
3. The owner says when to merge; nobody else merges into `main`. Merge it with a merge commit (not squash), so `dev` and `main` keep one history.
4. Tag the merge commit `vX.Y.Z` and publish a GitHub release with plain-language notes (`gh release create vX.Y.Z --target main`), and set the same version in `package.json` on `dev`.

Session reports and plans from past working sessions are kept in [`docs/sessions/`](docs/sessions/).

## Search engines and AI assistants

The site's address is `https://www.taylorssecretgarden.com` (`config/site.ts`; a preview uses its own URL). The plan and the pre-launch checklist are in [`SEO-STRATEGY.md`](SEO-STRATEGY.md).

- **Only production is indexed** ([`lib/indexing.ts`](lib/indexing.ts), decided at build time from `VERCEL_ENV`). Everywhere else (previews, `next start`, CI), `/robots.txt` disallows everything, pages say `noindex, nofollow`, and every response carries `X-Robots-Tag: noindex, nofollow` (`next.config.ts`).
- **Every page's metadata** comes from `pageMetadata` ([`lib/metadata.ts`](lib/metadata.ts)): title, description, canonical link, `og:url` and the link-preview card. An Album's page on Music is `/music/<slug>` and a Version's `/music/<album slug>/<version slug>` (`albumPath`, `versionPath`, `lib/catalogue.ts`, where every Album and Version has its `slug`; every link uses them, never a Deezer ID); the first Album's is `/music` itself. The old `/music?album=<Deezer ID>` links are sent on with a 308 by [`proxy.ts`](proxy.ts). `noindex: true` keeps a page out of search results (the guestbook, the styleguide). A page under `/swiftter` must set its own canonical link, or it inherits the feed's.
- **Generated files:** `/sitemap.xml` ([`app/sitemap.ts`](app/sitemap.ts); it lists the Swiftter threads that meet the indexing bar: a first Post of at least 140 visible characters, or one public reply, `meetsIndexingBar` in `service/swiftter.ts`; the others' pages say `noindex`), `/llms.txt` ([`app/llms.txt/route.ts`](app/llms.txt/route.ts)) and `/llms-full.txt` (every tracklist), built from the catalogue, the Tours data and the pages' cached Deezer data. A new Album or Tour appears in all of them without touching them.
- **Crawlers get metadata in the `<head>`:** `htmlLimitedBots` in `next.config.ts` adds Googlebot, Bingbot and the AI crawlers to Next's list, so a thread's canonical link is never streamed into the body.
- **JSON-LD** through `<JsonLd>` ([`components/json-ld.tsx`](components/json-ld.tsx)), which escapes `<`: `WebSite` on Home, `MusicAlbum` on Music (the page's own release, with its tracks and label), `ItemList` on Tours, `EventSeries` on each Tour page, and `DiscussionForumPosting` on each Swiftter thread.

Neither a metadata route nor a route handler can load next/font faces, and `lib/eras.ts` and `lib/tours.ts` bring them in with the Era looks. So `app/sitemap.ts` and `/llms.txt` read the Tours from `public/json/tours.json`, and the Eras from the catalogue.

## Swiftter's protections

Why these two, and how they behave off Vercel: [ADR-0005](docs/adr/0005-botid-and-posting-limit.md).

- **Vercel BotID** ([`botid`](https://vercel.com/docs/botid), invisible, no puzzle) guards signing up, signing in (email and Google), asking for a password reset link or an email verification code, and publishing a Post. The routes are listed once in [`lib/botid-routes.ts`](lib/botid-routes.ts): `instrumentation-client.ts` attaches BotID's token to those requests (its challenge script loads only when one is made), and the publish route and `app/api/auth/[...path]` (in front of Neon Auth's proxy) refuse a bot with 403 ([`lib/bot-protection.ts`](lib/bot-protection.ts)). `withBotId` in `next.config.ts` proxies BotID through this origin. It runs in Basic mode (free); Deep Analysis is a Firewall setting in the Vercel dashboard. Off Vercel (`next dev`, `next start`, CI) BotID has no OIDC token to verify with, so a stand-in treats a request carrying a token (`x-is-human`) as human and one without as a bot: the browser still fetches a real token, and the Playwright suite sends `BOTID_HUMAN` ([`e2e/member.ts`](e2e/member.ts)) with the requests it makes itself.
- **Write limits:** per Member, 5 Posts, 10 replies and 10 reshares per 10 minutes (`LIMITS` in [`lib/swiftter.ts`](lib/swiftter.ts)), counted in Postgres and checked again under a per-Member lock when the note is inserted. The next one gets 429 with `Retry-After` and a message saying when it is allowed; the composer shows it on the note and keeps the text. Torn-up notes, refused notes and undone reshares still count, so neither deleting nor refused attempts are a way round the limit (or round moderation's cost); "check again" is offered for a note's first 4 attempts (the hourly re-check carries on for a week).
- **Stored decisions, fail-closed** ([ADR-0007](docs/adr/0007-social-feed-and-stored-moderation.md)): a note is stored pending, then judged; approved notes become public, refused ones stay visible to their author only (with the reason), and a note with no verdict stays pending (author only, "check again", and the hourly cron) instead of being lost. Every attempt is appended to `moderation_decisions`. Before the model sees a note, its text is normalised (Unicode compatibility forms folded, invisible characters removed); look-alike letters from other scripts, leetspeak and spacing are left to the model, a known limit.
- **AI moderation** ([`service/moderation.ts`](service/moderation.ts), [ADR-0006](docs/adr/0006-ai-moderation-before-publishing.md)): every new Post's plain text is judged by `anthropic/claude-haiku-4.5` through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) (AI SDK 7, structured output, temperature 0, 8 s timeout) against `MODERATION_POLICY`, written in plain language in that file: no insults, harassment or hate, and on topic (Taylor, her music, Eras, tours, the fandom), judged leniently. The Post is passed as delimited, untrusted data. A refused Post is stored for its author only (see "Stored decisions" above): 422 `{ category: "insult" | "off_topic", message }`, which the composer writes on the note. No verdict in time (Gateway down, timeout) keeps the note pending: 202, checked again later. On Vercel the Gateway authenticates with the deployment's OIDC token; the Vercel team (Le Bon Tempérament) needs paid AI Gateway credits, since the free tier refuses this model. The Playwright suite and CI set `SWIFTTER_MODERATION=fake` (never honoured on a Vercel deployment): Posts containing `fake-insult`, `fake-off-topic` or `fake-moderation-down` are refused or fail, the rest are allowed. To check the policy against the real model, `npm run moderation:check` (opt-in, not in CI) moderates a handful of sample Posts and prints the verdicts; it needs `AI_GATEWAY_API_KEY`, or a `VERCEL_OIDC_TOKEN` from `npx vercel env pull --scope le-bon-temperament`, in `.env.local`.

## Account emails

On production, the account emails (a code to confirm an email address, a link to reset a password) are sent by the site, in the journal's look, rather than by Neon Auth ([ADR-0009](docs/adr/0009-account-emails-through-neon-auth-webhooks.md)). Neon Auth's webhook calls `POST /api/auth-email` ([`app/api/auth-email/route.ts`](app/api/auth-email/route.ts), [`service/auth-email.ts`](service/auth-email.ts)) with the code or link; the route checks Neon Auth's Ed25519 signature against the branch's JWKS ([`lib/auth/webhook-signature.ts`](lib/auth/webhook-signature.ts)) and sends the email through Resend's API from `noreply@taylorssecretgarden.com`, with the event id as idempotency key, so Neon Auth's retries never send twice. Unsigned or stale calls get 401. **Neon Auth does not fall back on its own email**: while the webhook is subscribed, a failure here (Resend down, `RESEND_API_KEY` missing) means the Member sees an error, and the owner gets an alert. Development branches have no webhook and keep Neon's shared sender.

The templates are hand-written table HTML with a plain-text version ([`lib/emails/`](lib/emails/)); the wordmark is `public/email/wordmark.png`, drawn by `npx tsx --conditions=react-server scripts/build-email-wordmark.ts`. To see them: `/styleguide/emails` (with the styleguide), or `npm run email:preview`, which writes every email to `.email-preview/` (not committed).

Turning it on (owner, once):

1. **Resend**: API Keys → Create API key, permission **Sending access**, domain **taylorssecretgarden.com**. In Domains → taylorssecretgarden.com, keep click and open tracking off, so the reset link is not rewritten through Resend's tracking address.
2. **Vercel** (le-bon-temperament, taylorssecretgarden): Settings → Environment Variables → `RESEND_API_KEY`, the key, **Production** only, **Sensitive**. Then deploy production with this code in it (a variable applies from the next deployment).
3. **Neon** (production branch only, once step 2 is live): Console → the project → Auth → Configuration → **Webhooks**: enable, Webhook URL `https://www.taylorssecretgarden.com/api/auth-email` (with `www`: Neon Auth does not follow redirects, and the apex redirects), events **`send.otp`** and **`send.magic_link`** only, timeout 5 seconds (the default). Save.
4. **Test** on production with a test account: ask for a password reset on `/forgot-password`, and for a code with "Send me a code" on the guestbook page (an unconfirmed account); both emails should arrive styled, and the link and the code should work. Vercel's logs show `Account email sent (forget-password link)`; Resend's dashboard lists the emails.

To go back to Neon Auth's own emails at any time, disable the webhook (step 3): Neon Auth then sends them through its SMTP settings again.

## Database

Swiftter's schema lives in [`db/schema.ts`](db/schema.ts): `members` (keyed by Neon Auth user id), `posts` (Posts and their replies, sanitised HTML, with a moderation `status` and `published_at`), `reshares`, `moderation_decisions` (every moderation attempt, appended, and every moderator's decision), `note_reports` (Members asking a human to look: a report, or an appeal) and `moderators` (who may handle them). Why this shape: [ADR-0007](docs/adr/0007-social-feed-and-stored-moderation.md). All Swiftter data access goes through [`service/swiftter.ts`](service/swiftter.ts). The API:

| Route                                            | What                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/swiftter/posts?cursor=`                | The public feed, the same for everyone: Posts and reshares, newest published first, 20 per page, `{ items, nextCursor }`.                                                                                                                                                                                   |
| `POST /api/swiftter/posts`                       | Write a note `{ content, parentId? }` (a reply with `parentId`): 201 approved (public), 422 refused (kept, author only, with the reason), 202 no verdict (kept pending, checked again later); 400 invalid, 404 replying to a note that is not public, 429 limit.                                            |
| `DELETE /api/swiftter/posts/[id]`                | Tear up one of your notes: 204; 404 for anyone else's.                                                                                                                                                                                                                                                      |
| `POST`/`DELETE /api/swiftter/posts/[id]/reshare` | Reshare someone else's public Post, or undo it: 201/204; 422 your own, 409 already, 404 not public.                                                                                                                                                                                                         |
| `POST /api/swiftter/posts/[id]/check`            | "Check again" on your pending note (at most 4 moderation attempts in all).                                                                                                                                                                                                                                  |
| `POST /api/swiftter/posts/[id]/report`           | "Report" someone else's public note (Post or reply) `{ reason? }` (plain text, 500 characters at most): 201, 200 if you already had; 422 your own, 404 not public, 429 past 10 reports in 10 minutes.                                                                                                       |
| `POST /api/swiftter/posts/[id]/appeal`           | "Ask a human to look again" at your refused note: 201, 200 if you already had; 404 when it is not your refused note.                                                                                                                                                                                        |
| `GET /api/swiftter/me`                           | Your held notes (pending or refused, with reasons) and what you reshare: session only, `no-store`.                                                                                                                                                                                                          |
| `DELETE /api/swiftter/me`                        | Delete your account: your notes torn up, your reshares and your Neon Auth account deleted, signed out; 204. From `/guestbook`.                                                                                                                                                                              |
| `GET /api/swiftter/me/export`                    | Your data as a JSON download (account, notes in every state, reshares, moderation decisions, your reports and appeals): session only, `no-store`.                                                                                                                                                           |
| `GET /api/swiftter/moderation`                   | Moderators only: the notes with open reports or appeals, their text (held ones' too), authors, reasons and the model's last decision, `{ items, total }`; 401 signed out, 403 anyone else, `no-store`.                                                                                                      |
| `POST /api/swiftter/moderation/[id]`             | Moderators only: `{ action: "tear-up" \| "keep" \| "publish", note? }` on a note with open reports or an appeal: 204, recorded in `moderation_decisions` as `human:<member id>`, its reports settled, the feed refreshed; 403 anyone else, 409 already handled (or publishing a note that was not refused). |
| `GET /api/cron/moderation`                       | Vercel Cron (hourly, `vercel.json`): re-checks pending notes (every run for a day, then daily, given up after a week), sends the owner alerts (below), and once a day purges what is past retention (30 days); needs `Authorization: Bearer $CRON_SECRET`.                                                  |

**Owner alerts** ([`service/owner-alerts.ts`](service/owner-alerts.ts)). The hourly cron tells the owner when notes are given up on (moderation gave no verdict for a week) and, in one alert per run, about the reports and appeals sent since the last one. With `OWNER_ALERTS_GITHUB_TOKEN` set (a fine-grained token limited to this repository, Issues: read and write; Production only, Sensitive) each alert opens an issue labelled `owner-alert`, or comments on the open issue with the same title, so the same alert is never opened twice; without it, or when GitHub fails, the alert is only logged (and reports stay unsent, for the next run). The repository is public, so an alert names notes by id and links only to public threads: never a Member, an email, a reason someone wrote or a held note's text. Those are on the moderation page (below) and in `note_reports` and `posts`; each alert links to that page. Resolved reports are purged after 30 days, and every report goes with its note.

**Moderation** (`/guestbook/moderation`, [`service/moderators.ts`](service/moderators.ts), #166). Moderators (Members with a row in `moderators`; the header shows them a "Moderation" link) see every note with open reports or an appeal: its text (a refused note's too), its author, each report's reason and date, the model's last decision and its thread. Per note, in two taps (the action, then its confirmation): **Tear up** (the app's own tear-up, as if its author had), **Keep** (it stays public, or stays refused), or, on a refused note, **Publish after all** (approved and published now). Each decision appends a `moderation_decisions` row (model `human:<moderator's member id>`, their optional note as the reason, kept past the 30-day purge of the model's reasons), settles the note's open reports and appeals, and refreshes the feed. The page is a 404 for everyone else, and its routes answer 403; the role is checked again in the service. A Member's data export says a decision was a human's, not which moderator's.

Every write goes through [`lib/member-write.ts`](lib/member-write.ts): same-origin only (403), JSON only (415), signed in (401, or 503 when Neon Auth fails), BotID (403); then ownership and visibility in SQL (404). Threads have their own page, `/swiftter/p/[id]` (server-rendered, with `DiscussionForumPosting` structured data; demo, seed and torn-up notes, and threads below the indexing bar, are `noindex`).

Every database command uses `DATABASE_URL` (read from `.env.local` when it is not already set in the environment). There are two long-lived Neon branches: **production** (Vercel's Production environment) and **`dev`** (Preview and Development: every preview deployment and local work). `.env.local` points at `dev`: `npx vercel env pull .env.local --environment=development --scope le-bon-temperament --project taylorssecretgarden` gives it.

**Production's credentials are on no laptop.** Its `DATABASE_URL` is a Sensitive variable in Vercel (write-only: builds and functions get it, nobody can read it back) and otherwise lives only in Neon. Production migrations run in the **Migrate production** workflow ([`.github/workflows/migrate-production.yml`](.github/workflows/migrate-production.yml)): Actions → Migrate production → Run workflow, pick the branch whose migrations to apply (usually `dev`, before merging a release) and type `production`. It fetches the connection string from Neon's API for the run, masked in the log. Apply a migration to `dev` first (`npm run db:migrate` locally); its reverse lives in `drizzle/down/`.

Neon Auth keeps the Members' accounts (users, sessions) in the `neon_auth` schema of the same database. It belongs to Neon: `drizzle.config.ts` limits drizzle-kit to `public`, and nothing in the app writes to `neon_auth` except through `/api/auth`, with one exception: a Member deleting their account deletes their own `neon_auth."user"` row, through the `public.delete_auth_user` function (Neon Auth's hosted `delete-user` is disabled; [ADR-0007](docs/adr/0007-social-feed-and-stored-moderation.md), [ADR-0008](docs/adr/0008-least-privilege-database-role.md)). The development scripts (`npm run seed`, `npm run unseed`) read and write `neon_auth` directly, so they need the owner's connection string.

```bash
npm run db:migrate   # apply the SQL migrations in drizzle/
npm run db:seed      # insert the demo Members and Posts (safe to re-run)
npm run db:unseed    # show the demo rows; add `-- --yes` to delete them
npm run db:generate  # after editing db/schema.ts: write a new migration to drizzle/, then commit it
```

### Moderators

The moderator role is a row in `moderators` (granted when, and by whom: null means the owner, with the script or the workflow), so adding a moderator needs no redeploy. `npm run moderator` grants, revokes or lists it ([`scripts/moderator.ts`](scripts/moderator.ts)):

```bash
npm run moderator -- grant <member id or email>   # makes the Member row from Neon Auth if they never wrote
npm run moderator -- revoke <member id or email>
npm run moderator -- list
```

A Member's id is the end of their Member page's address (`/swiftter/m/<id>`). The script uses `DATABASE_URL` (`.env.local`: the `dev` branch) and refuses production's database unless given `--production`, and `--production` anywhere else; never with `NODE_ENV` or `VERCEL_ENV` set to `production`.

**On production**, through the **Grant moderator** workflow ([`.github/workflows/grant-moderator.yml`](.github/workflows/grant-moderator.yml)), which fetches the connection string from Neon's API like Migrate production, so no laptop needs production's credentials. Its log is public: it takes a Member id only, never an email. The owner grants himself first, once the release with migration 0006 is out:

1. Once the release with migration 0006 is merged: Actions → **Migrate production** → Run workflow on `main`, type `production` (skip if 0006 is already applied).
2. Sign in on the site and open your Member page (your name on one of your notes, or "Your Member page" on `/guestbook`): your id is the end of its address. Never wrote a note? Open `/api/auth/get-session` while signed in: it is `user.id`.
3. Actions → **Grant moderator** → Run workflow, branch `main`, action `grant`, member: that id. The last step lists the moderators' ids.
4. Reload any page: the header shows "Moderation". Revoking is the same workflow with `revoke`.

A moderator who deletes their account loses the role with it. The app's role (`swiftter_app`) reads and writes `moderators` through its default privileges, like every table migrations create; migration 0006 needs no grant.

### Database roles

The deployed app connects as **`swiftter_app`**, not as the owner (`neondb_owner`): it can read and write the rows of Swiftter's tables in `public`, and delete one Neon Auth account by id through `public.delete_auth_user` (migration 0005), and nothing else. It cannot read `neon_auth` (emails, password hashes, sessions) or `drizzle`, create or alter tables, or truncate them. Why: [ADR-0008](docs/adr/0008-least-privilege-database-role.md). Migrations, the backup, the seed scripts and CI keep the owner: Migrate production and Backup production ask Neon's API for `neondb_owner`'s connection string, as before.

The role is not a migration (roles belong to a branch, and its password must never be committed): [`db/roles/swiftter_app.sql`](db/roles/swiftter_app.sql) creates it and grants exactly that, each line explained. Later migrations need no grant for a new table (the script sets `neondb_owner`'s default privileges); a new function the app calls does (`GRANT EXECUTE … TO swiftter_app` in its migration, as 0005 does).

**Production**, once, by the owner, after the release with migration 0005 is migrated (the script grants its function):

1. Make a password on your own machine: `openssl rand -hex 24` (hex: nothing to escape in a URL; Neon wants at least 60 bits of entropy, this is 192).
2. Neon console → the project → **SQL Editor**, branch **production**, database `neondb`, role `neondb_owner`. Paste `db/roles/swiftter_app.sql`, replace `:'password'` in `CREATE ROLE` with the password in single quotes, and run it. Create the role this way, not under Roles & Databases: roles made there are members of `neon_superuser`. Then remove the query from the editor's history, so the password is kept nowhere but in step 4.
3. Build its **pooled** connection string: the owner's pooled string from **Connect** (host ending in `-pooler`) with the user and password replaced, `postgresql://swiftter_app:<password>@ep-…-pooler.<region>.aws.neon.tech/neondb?sslmode=require&channel_binding=require`.
4. Vercel → `taylorssecretgarden` (team Le Bon Tempérament) → Settings → Environment Variables: set **Production** `DATABASE_URL` to it, **Sensitive**. Then redeploy production (Deployments → the current production deployment → Redeploy): functions read the variable when deployed.
5. Check: the Swiftter feed loads, a test account can publish, and deleting it from `/guestbook` works. In the SQL editor (as `neondb_owner`), `select usename, count(*) from pg_stat_activity group by 1` shows `swiftter_app`'s connections.

To go back, set Production `DATABASE_URL` to the owner's pooled string again (from Connect) and redeploy; the role can stay.

**dev (Preview)**: the same on the `dev` branch, with a password of its own: `npm run db:migrate` first (from `.env.local`), then steps 1–3 on branch `dev`, then Vercel's **Preview** `DATABASE_URL` (Sensitive), and redeploy a preview. Keep **Development** (`.env.local`, what `npx vercel env pull` gives) on the owner: local work runs migrations, the seed scripts and the integration tests' Neon Auth fixtures, which need it. To run the app locally as the role, set `DATABASE_URL` for that command only.

Branches made from production after step 2 (CI's, a reset `dev`) inherit the role **with production's password**: after resetting `dev` from production, give it its own (`ALTER ROLE swiftter_app PASSWORD '…';` on `dev`) and update Preview's `DATABASE_URL`. CI connects as the owner and does not depend on the role.

To remove the role from a branch (as `neondb_owner`, which Neon does not allow `DROP OWNED`), close its connections first, or the pooler keeps sessions of a role that no longer exists (`invalid role OID` once it is created again):

```sql
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'swiftter_app';
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM swiftter_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM swiftter_app;
REVOKE ALL ON SCHEMA public FROM swiftter_app;
REVOKE ALL ON FUNCTION public.delete_auth_user(text) FROM swiftter_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public REVOKE ALL ON TABLES FROM swiftter_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public REVOKE ALL ON SEQUENCES FROM swiftter_app;
REVOKE ALL ON DATABASE neondb FROM swiftter_app;
DROP ROLE swiftter_app;
```

### Backups

The **Backup production** workflow ([`.github/workflows/backup-production.yml`](.github/workflows/backup-production.yml)) runs every Monday (and by hand: Actions → Backup production → Run workflow). It fetches production's connection string from Neon's API like Migrate production, runs `pg_dump` at the project's Postgres major version, encrypts the dump with [`age`](https://github.com/FiloSottile/age) and keeps it 30 days as the run's artifact. The repository is public, so anyone can download its artifacts: the dump is only ever uploaded encrypted, and the job fails if no key is set.

One-time setup, by the owner:

1. Make a key pair on your own machine: `age-keygen -o garden-backup.key`. It prints the public key (`age1…`).
2. Keep `garden-backup.key` (the private key) offline, e.g. in a password manager and on a USB stick: not in the repository, not in GitHub, not in Vercel. Without it no backup can be opened.
3. Set the public key as a repository variable: Settings → Secrets and variables → Actions → Variables → `BACKUP_AGE_RECIPIENT` = `age1…` (or `gh variable set BACKUP_AGE_RECIPIENT --body age1…`).
4. Run the workflow once by hand and check it succeeds.

To restore: download the artifact, `age --decrypt -i garden-backup.key -o production.dump production-….dump.age`, then `pg_restore --no-owner --dbname=<a new Neon branch's URL> production.dump` (restore into a new branch first, never straight over production).

## Seeding

`npm run db:seed` inserts ten demo Posts from four fictional demo Members, all marked `is_demo` (the feed labels them "Demo"). Every row has a fixed id, so re-running it changes nothing. A fresh database needs `npm run db:migrate` first. To remove the demo content later (for example once real Posts exist), `npm run db:unseed` shows what it would delete and `npm run db:unseed -- --yes` deletes it; real Members and their Posts are never touched, and `npm run db:seed` brings the demo back. The demo content is on production, whose credentials are on no laptop: to remove it before launch, run the command once with production's connection string set for that command only (`DATABASE_URL='…' npm run db:unseed -- --yes`, the string from the Neon console's Connect dialog), then close the terminal.

`npm run seed` loads the **development fixtures** ([`scripts/seed.ts`](scripts/seed.ts), data in [`scripts/seed-data.ts`](scripts/seed-data.ts)) into a development branch: six fictional accounts (real Neon Auth accounts at `@seed.invalid`, one shared password, `seed-password-not-for-production`), 53 Posts over three feed pages (shortest, longest, unicode, emoji, right-to-left), an eight-level thread and a wide one, reshares (one of a Post torn up since), and notes in every moderation state (approved, refused as unkind or off-topic, pending). One account never writes, another has a very long name. Every row is marked `is_seed`; it is idempotent and deterministic (fixed ids and times). `npm run unseed -- --dry-run` counts what would go; `npm run unseed` removes exactly the seed's rows and accounts (a seed note a real Member replied to or reshared is torn up instead, so their content still reads). **Both refuse to run against production or with `NODE_ENV`/`VERCEL_ENV=production`** ([`db/guard.ts`](db/guard.ts), tested in `tests/unit/seed-guard.test.ts`). CI loads the fixtures on its throwaway branches too.

For a throwaway local database (enough for the signed-out Swiftter tests; sign-in needs a Neon branch):

```bash
docker run --rm -d --name swiftter-db -p 5432:5432 -e POSTGRES_PASSWORD=swiftter postgres:17
DATABASE_URL=postgres://postgres:swiftter@localhost:5432/postgres npm run db:migrate
DATABASE_URL=postgres://postgres:swiftter@localhost:5432/postgres npm run db:seed
```
