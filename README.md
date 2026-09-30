# Taylor's Secret Garden

A Taylor Swift fan site and portfolio piece:

- **Home**: the journal's opening spread: a taped Eras Tour photo, three ways in (Music, Tours, Swiftter), all twelve Eras pressed like flowers (each opens its Album on Music) and the Tour posters pinned to the wall.
- **Music**: all 16 Albums (every studio Album and every Taylor's Version, each in its most complete edition, curated in `lib/catalogue.ts`), with cover, tracklist, durations and label fetched live from Deezer's public API. An open Album lists its other Versions on Deezer (standard and international editions, live and acoustic albums, "Chapter" compilations), each with its own tracklist and link (`?album=<id>`). Every Monday, [a workflow](.github/workflows/releases.yml) compares Deezer with the catalogue (`npm run releases:check`) and opens an issue labelled `new-release` for anything new: a new Album needs its Era added by hand (look, flower, fonts), a new Version one line in the catalogue.
- **Tours**: a vertical journal of every Tour (ticket stub, poster, footage), each linking to its own page with that Tour's facts (from `public/json/tours.json`, typed in `lib/tours.ts`).
- **Swiftter** (`/swiftter`, formerly `/forum`): a small feed where signed-in Members publish Posts. Anyone can read it; publishing needs signing the guestbook (email + password, or Google).

The domain vocabulary (Era, Album, Tour, Swiftter, Post, Member) is defined in [`CONTEXT.md`](CONTEXT.md), and design decisions are recorded in [`docs/adr/`](docs/adr/).

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack), React 19, TypeScript 6
- [Tailwind CSS 4](https://tailwindcss.com/) (CSS-first config in `styles/globals.css`); [shadcn/ui](https://ui.shadcn.com/) is configured (`components.json`, [ADR-0002](docs/adr/0002-shadcn-replaces-nextui.md)) for primitives copied into `components/ui/` when a page needs one (none does yet: the scrapbook kit covers them)
- [Neon Auth](https://neon.com/docs/auth/overview) (managed Better Auth, `@neondatabase/auth`, beta SDK pinned exactly) for sign-in, with our own guestbook forms ([ADR-0004](docs/adr/0004-neon-auth-replaces-clerk.md))
- [Neon Postgres](https://neon.com/) (via the Vercel Marketplace) with [Drizzle ORM](https://orm.drizzle.team/) for Swiftter's Members and Posts ([ADR-0003](docs/adr/0003-neon-drizzle-for-swiftter.md))
- [Cloudinary](https://cloudinary.com/) for Tour images, videos and the home photo (URL helpers in `lib/cloudinary.ts`). Pictures go through next/image and are served from the site's own origin; the videos stream from Cloudinary
- [Deezer API](https://developers.deezer.com/api) for the Album catalogue (no credentials needed)
- [Motion](https://motion.dev/) (`motion/react`) for the scrapbook's hover lifts and tab transitions
- [Playwright](https://playwright.dev/) with [axe](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) for the smoke tests

## Design system

The site is a fan's scrapbook (the 2026 redesign, #17), built from:

- **Journal tokens** in `styles/globals.css`: `paper`, `card`, `ink`, `soft`, `line`, `accent`, `on-accent`, `tape` as CSS variables and Tailwind colours (`bg-paper`, `text-soft`...), plus `font-hand` (Caveat), `font-body` (Karla), `font-serif` (Fraunces), `font-serif-italic` and `font-display` (the current Era's face). Caveat and Fraunces are self-hosted static cuts of the one weight the site uses (`assets/fonts/`, rebuilt with `uv run --with fonttools --with brotli python scripts/build-fonts.py`), half the size of Google's variable files.
- **Era looks** in `lib/eras.ts`: every Era's palette, flower, fan note and display face, and which Era each Album belongs to. The Eras Tour, which spans every Era, has a look of its own (`ERAS_TOUR_LOOK` in `lib/tours.ts`). `<EraScope era="…">` (`components/era-scope.tsx`) applies one by overriding the tokens on a container; the colours fade across when the Era changes. Era display faces (`config/era-fonts.ts`) are not preloaded, so a face downloads only when its Era is on screen.
- **The scrapbook kit** in `components/scrapbook/`: paper, washi tape, pin, polaroid, bracelet, pressed flowers, scribble, arrow, highlight, sticky note, rubber stamp, ticket stub, ruled list.

`/styleguide` shows the kit in several Eras and every Era's palette. It is served by `next dev`, and by a production build only with `ENABLE_STYLEGUIDE=1` (the Playwright suite and CI set it); the live site answers 404.

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
npm run lint        # ESLint 9, flat config (eslint.config.mjs)
npm run typecheck   # tsc --noEmit
npm run test:e2e    # Playwright smoke suite
npm run lighthouse  # Lighthouse CI on a production build (run `npm run build` first)
```

`npm test` runs the unit tests (Vitest, `tests/unit/`): hermetic, no network or database. AI moderation runs against the AI SDK's mock model (`MockLanguageModelV4`): allowed, both refusals, timeout, Gateway error and malformed answers, prompt injection and unicode. The sanitiser and the database guards are covered too. `npm run test:integration` runs `tests/integration/` against a disposable Neon branch only (the same guard as below), and `npm run test:coverage` reports coverage.

`npm run test:e2e` builds the app and starts it on port 3100 (or reuses a server already listening there), then drives it as a black box: every route renders with no page errors and no console errors or warnings, the nav highlights the current page, the site chrome (and the styleguide) pass axe at WCAG 2.2 AA, fit a 390px phone and stay still under reduced motion (helpers in `e2e/checks.ts`, which each redesigned page enables for its whole route), Music loads Albums and tracklists, Tours lists every Tour and each Tour page shows its own facts, and Swiftter reads, publishes, sanitises and deletes Posts. Every page has one h1, its canonical link and link-preview cards, and `e2e/seo.spec.ts` checks what crawlers get (see [Search engines and AI assistants](#search-engines-and-ai-assistants)). The guestbook pages are checked the same way, plus their keyboard order, validation and error states.

The tests read `.env.local` like the app does. Everything that writes (signing up, signing in, publishing Posts) needs a disposable Neon branch: `DATABASE_URL` and `NEON_AUTH_BASE_URL` of the same branch, which must not be production (the guard in [`e2e/member.ts`](e2e/member.ts) compares against a hash of the production endpoint), plus `NEON_AUTH_COOKIE_SECRET`; otherwise those tests are skipped. With a branch, the `setup` project ([`e2e/member.setup.ts`](e2e/member.setup.ts)) first signs up a fresh test Member ("Swiftter Tester", a unique `@example.com` address) through the sign-up form, and the signed-in tests reuse its session (`e2e/.auth/`, git-ignored). To get a branch locally, create one from production in the Neon console (or the API), with an expiry, and put its connection string and Auth URL in `.env.local`; migrate and seed it (see [Database](#database)). The first run needs a browser: `npx playwright install chromium`.

## CI

[GitHub Actions](.github/workflows/ci.yml) runs two jobs on every pull request and on pushes to `dev`, each on a production build under `next start`:

- **smoke**: lint, typecheck, build and the Playwright suite. On failure the Playwright report and traces are uploaded as an artifact.
- **lighthouse**: [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) ([`lighthouserc.js`](lighthouserc.js)) audits Home, Music, Tours, the Eras Tour page, Swiftter and the sign-in page with Lighthouse's mobile emulation, three runs each: the median run must score at least 0.9 for Accessibility (an error) and should for Performance (a warning, since shared runners swing it by up to 0.3 between runs; check it on the Vercel preview). The scores table lands in the run summary and the full reports are uploaded as an artifact.

Each job creates its own Neon branch from production with [`create-branch-action`](https://github.com/neondatabase/create-branch-action) (database and Neon Auth URL), migrates and seeds it (so Lighthouse audits a real feed), and deletes it at the end, even when a step fails (it also expires after two hours). They need the `NEON_API_KEY` and `NEON_AUTH_COOKIE_SECRET` repository secrets and the `NEON_PROJECT_ID` variable.

To run Lighthouse locally, build first, then `npm run lighthouse` (it starts `next start` on port 3180; set `LHCI_PORT` to change it, and `CHROME_PATH` if Chrome is not found, e.g. Playwright's Chromium).

## Search engines and AI assistants

The site's address is `https://www.taylorssecretgarden.com` (`config/site.ts`; a preview uses its own URL). The plan and the pre-launch checklist are in [`SEO-STRATEGY.md`](SEO-STRATEGY.md).

- **Only production is indexed** ([`lib/indexing.ts`](lib/indexing.ts), decided at build time from `VERCEL_ENV`). Everywhere else (previews, `next start`, CI), `/robots.txt` disallows everything, pages say `noindex, nofollow`, and every response carries `X-Robots-Tag: noindex, nofollow` (`next.config.ts`).
- **Every page's metadata** comes from `pageMetadata` ([`lib/metadata.ts`](lib/metadata.ts)): title, description, canonical link, `og:url` and the link-preview card. An Album's page on Music is `/music?album=<catalogue ID>`; a Version's is its own ID. `noindex: true` keeps a page out of search results (the guestbook, the styleguide). A page under `/swiftter` must set its own canonical link, or it inherits the feed's.
- **Generated files:** `/sitemap.xml` ([`app/sitemap.ts`](app/sitemap.ts); Swiftter's Post pages go at its marked extension point) and `/llms.txt` ([`app/llms.txt/route.ts`](app/llms.txt/route.ts)), both built from the catalogue and the Tours data. A new Album or Tour appears in both without touching them.
- **JSON-LD** through `<JsonLd>` ([`components/json-ld.tsx`](components/json-ld.tsx)), which escapes `<`: `WebSite` on Home, `MusicAlbum` on Music, `ItemList` on Tours, and `EventSeries` on each Tour page.

Neither a metadata route nor a route handler can load next/font faces, and `lib/eras.ts` and `lib/tours.ts` bring them in with the Era looks. So `app/sitemap.ts` and `/llms.txt` read the Tours from `public/json/tours.json`, and the Eras from the catalogue.

## Swiftter's protections

Why these two, and how they behave off Vercel: [ADR-0005](docs/adr/0005-botid-and-posting-limit.md).

- **Vercel BotID** ([`botid`](https://vercel.com/docs/botid), invisible, no puzzle) guards signing up, signing in (email and Google) and publishing a Post. The routes are listed once in [`lib/botid-routes.ts`](lib/botid-routes.ts): `instrumentation-client.ts` attaches BotID's token to those requests (its challenge script loads only when one is made), and the publish route and `app/api/auth/[...path]` (in front of Neon Auth's proxy) refuse a bot with 403 ([`lib/bot-protection.ts`](lib/bot-protection.ts)). `withBotId` in `next.config.ts` proxies BotID through this origin. It runs in Basic mode (free); Deep Analysis is a Firewall setting in the Vercel dashboard. Off Vercel (`next dev`, `next start`, CI) BotID has no OIDC token to verify with, so a stand-in treats a request carrying a token (`x-is-human`) as human and one without as a bot: the browser still fetches a real token, and the Playwright suite sends `BOTID_HUMAN` ([`e2e/member.ts`](e2e/member.ts)) with the requests it makes itself.
- **Posting limit:** a Member may publish 5 Posts per 10 minutes (`POSTING_LIMIT` in [`service/swiftter.ts`](service/swiftter.ts)), counted in Postgres and checked again under a per-Member lock when the Post is inserted. The 6th gets 429 with `Retry-After` and a message saying when the next one is allowed; the composer shows it on the note and keeps the text. A Post deleted within the 10 minutes still counts: its content is erased and `deleted_at` set, and the empty row is removed on a later delete once the window has passed, so deleting is no way round the limit (or round moderation's cost).
- **AI moderation** ([`service/moderation.ts`](service/moderation.ts), [ADR-0006](docs/adr/0006-ai-moderation-before-publishing.md)): every new Post's plain text is judged by `anthropic/claude-haiku-4.5` through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) (AI SDK 7, structured output, temperature 0, 8 s timeout) against `MODERATION_POLICY`, written in plain language in that file: no insults, harassment or hate, and on topic (Taylor, her music, Eras, tours, the fandom), judged leniently. The Post is passed as delimited, untrusted data. A refused Post is not stored: 422 `{ category: "insult" | "off_topic", message }`, which the composer writes on the note, keeping the text. No verdict in time (Gateway down, timeout) is 503 "try again", nothing stored. On Vercel the Gateway authenticates with the deployment's OIDC token; the Vercel team (Le Bon Tempérament) needs paid AI Gateway credits, since the free tier refuses this model. The Playwright suite and CI set `SWIFTTER_MODERATION=fake` (never honoured on a Vercel deployment): Posts containing `fake-insult`, `fake-off-topic` or `fake-moderation-down` are refused or fail, the rest are allowed. To check the policy against the real model, `npm run moderation:check` (opt-in, not in CI) moderates a handful of sample Posts and prints the verdicts; it needs `AI_GATEWAY_API_KEY`, or a `VERCEL_OIDC_TOKEN` from `npx vercel env pull --scope le-bon-temperament`, in `.env.local`.

## Database

Swiftter's schema lives in [`db/schema.ts`](db/schema.ts): `members` (keyed by Neon Auth user id) and `posts` (sanitised HTML, newest first). All Swiftter data access goes through [`service/swiftter.ts`](service/swiftter.ts); the API is `GET /api/swiftter/posts` (public feed), `POST /api/swiftter/posts` (publish as the signed-in Member; see [Swiftter's protections](#swiftters-protections)) and `DELETE /api/swiftter/posts/[id]` (a Member deletes one of their own Posts, "tear up" on the note: 204, 401 signed out, 404 for anyone else's Post).

Every database command uses `DATABASE_URL` (read from `.env.local` when it is not already set in the environment). Point it at the database you mean: `.env.local` pulled from Vercel holds the real Neon database.

Neon Auth keeps the Members' accounts (users, sessions) in the `neon_auth` schema of the same database. It belongs to Neon: `drizzle.config.ts` limits drizzle-kit to `public`, and nothing in the app writes to `neon_auth` except through `/api/auth`.

```bash
npm run db:migrate   # apply the SQL migrations in drizzle/
npm run db:seed      # insert the demo Members and Posts (safe to re-run)
npm run db:unseed    # show the demo rows; add `-- --yes` to delete them
npm run db:generate  # after editing db/schema.ts: write a new migration to drizzle/, then commit it
```

## Seeding

`npm run db:seed` inserts ten demo Posts from four fictional demo Members, all marked `is_demo` (the feed labels them "Demo"). Every row has a fixed id, so re-running it changes nothing. A fresh database needs `npm run db:migrate` first. To remove the demo content later (for example once real Posts exist), `npm run db:unseed` shows what it would delete and `npm run db:unseed -- --yes` deletes it; real Members and their Posts are never touched, and `npm run db:seed` brings the demo back.

For a throwaway local database (enough for the signed-out Swiftter tests; sign-in needs a Neon branch):

```bash
docker run --rm -d --name swiftter-db -p 5432:5432 -e POSTGRES_PASSWORD=swiftter postgres:17
DATABASE_URL=postgres://postgres:swiftter@localhost:5432/postgres npm run db:migrate
DATABASE_URL=postgres://postgres:swiftter@localhost:5432/postgres npm run db:seed
```
