# Taylor's Secret Garden

A Taylor Swift fan site and portfolio piece:

- **Home**: the journal's opening spread: a taped Eras Tour photo, three ways in (Music, Tours, Swiftter), all eleven Eras pressed like flowers (each opens its Album on Music) and the Tour posters pinned to the wall.
- **Music**: every Album, with its tracklist, durations, label and release date, fetched live from Deezer's public API.
- **Tours**: a horizontal, scroll-driven timeline of every Tour, each linking to its own page.
- **Swiftter** (`/swiftter`, formerly `/forum`): a small feed where signed-in Members publish Posts. Anyone can read it; publishing needs a Clerk sign-in.

The domain vocabulary (Era, Album, Tour, Swiftter, Post, Member) is defined in [`CONTEXT.md`](CONTEXT.md), and design decisions are recorded in [`docs/adr/`](docs/adr/).

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack), React 19, TypeScript 6
- [Tailwind CSS 4](https://tailwindcss.com/) (CSS-first config in `styles/globals.css`) and [shadcn/ui](https://ui.shadcn.com/) primitives in `components/ui/`
- [Clerk 7](https://clerk.com/) for sign-in
- [Neon Postgres](https://neon.com/) (via the Vercel Marketplace) with [Drizzle ORM](https://orm.drizzle.team/) for Swiftter's Members and Posts ([ADR-0003](docs/adr/0003-neon-drizzle-for-swiftter.md))
- [Cloudinary](https://cloudinary.com/) (via `next-cloudinary`) for Tour images, videos and backgrounds
- [Deezer API](https://developers.deezer.com/api) for the Album catalogue (no credentials needed)
- [Motion](https://motion.dev/) (`motion/react`) for the scrapbook's hover lifts and tab transitions
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) for the Tours timeline (until the Tours redesign)
- [Playwright](https://playwright.dev/) with [axe](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) for the smoke tests

## Design system

The site is a fan's scrapbook (the 2026 redesign, #17), built from:

- **Journal tokens** in `styles/globals.css`: `paper`, `card`, `ink`, `soft`, `line`, `accent`, `on-accent`, `tape` as CSS variables and Tailwind colours (`bg-paper`, `text-soft`...), plus `font-hand` (Caveat), `font-body` (Karla), `font-serif` (Fraunces) and `font-display` (the current Era's face).
- **Era looks** in `lib/eras.ts`: every Era's palette, flower, fan note and display face, and which Era each Album belongs to. `<EraScope era="…">` (`components/era-scope.tsx`) applies one by overriding the tokens on a container; the colours fade across when the Era changes. Era display faces (`config/era-fonts.ts`) are not preloaded, so a face downloads only when its Era is on screen.
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
```

`npm run test:e2e` builds the app and starts it on port 3100 (or reuses a server already listening there), then drives it as a black box: every route renders with no page errors and no console errors or warnings, the nav highlights the current page, the site chrome (and the styleguide) pass axe at WCAG 2.1 AA, fit a 390px phone and stay still under reduced motion (helpers in `e2e/checks.ts`, which each redesigned page enables for its whole route), Music loads Albums and tracklists, the Tours timeline scrolls end to end, and Swiftter reads, publishes and sanitises Posts. The Swiftter tests need a migrated and seeded database at `DATABASE_URL` (see [Seeding](#seeding); never run them against the real one, they publish Posts). The signed-in tests sign in a dedicated test Member of the Clerk development instance with [`@clerk/testing`](https://clerk.com/docs/testing/playwright/overview); set `E2E_CLERK_USER_USERNAME` and `E2E_CLERK_USER_PASSWORD` to run them locally, otherwise they are skipped. That test Member (`e2e+swiftter_clerk_test@example.com`, username `swiftter_e2e`, name "Swiftter Tester", which the tests expect) was created with a password through Clerk's Backend API (`POST /v1/users` with the development `CLERK_SECRET_KEY`); its credentials live in the `E2E_CLERK_USER_*` repository secrets. The first run needs a browser: `npx playwright install chromium`.

## CI

[GitHub Actions](.github/workflows/ci.yml) runs lint, typecheck, build and the Playwright suite on every pull request and on pushes to `dev`. The environment variables come from repository secrets; Swiftter runs against a Postgres 17 service container that is migrated and seeded before the tests. On failure the Playwright report and traces are uploaded as an artifact.

## Database

Swiftter's schema lives in [`db/schema.ts`](db/schema.ts): `members` (keyed by Clerk user id) and `posts` (sanitised HTML, newest first). All Swiftter data access goes through [`service/swiftter.ts`](service/swiftter.ts); the API is `GET /api/swiftter/posts` (public feed) and `POST /api/swiftter/posts` (publish as the signed-in Member).

Every database command uses `DATABASE_URL` (read from `.env.local` when it is not already set in the environment). Point it at the database you mean: `.env.local` pulled from Vercel holds the real Neon database.

```bash
npm run db:migrate   # apply the SQL migrations in drizzle/
npm run db:seed      # insert the demo Members and Posts (safe to re-run)
npm run db:generate  # after editing db/schema.ts: write a new migration to drizzle/, then commit it
```

## Seeding

`npm run db:seed` inserts ten demo Posts from four fictional demo Members, all marked `is_demo` (the feed labels them "Demo"). Every row has a fixed id, so re-running it changes nothing. A fresh database needs `npm run db:migrate` first.

For a throwaway local database:

```bash
docker run --rm -d --name swiftter-db -p 5432:5432 -e POSTGRES_PASSWORD=swiftter postgres:17
DATABASE_URL=postgres://postgres:swiftter@localhost:5432/postgres npm run db:migrate
DATABASE_URL=postgres://postgres:swiftter@localhost:5432/postgres npm run db:seed
```
