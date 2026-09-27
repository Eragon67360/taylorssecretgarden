# Taylor's Secret Garden

A Taylor Swift fan site and portfolio piece:

- **Home**: a landing page over a concert photo.
- **Music**: every Album, with its tracklist, durations, label and release date, fetched live from Deezer's public API.
- **Tours**: a horizontal, scroll-driven timeline of every Tour, each linking to its own page.
- **Swiftter** (`/forum`): a small feed where signed-in Members publish Posts. Its database is being rebuilt on Neon Postgres ([#12](https://github.com/Eragon67360/taylorssecretgarden/issues/12)); until then the feed shows an error page.

The domain vocabulary (Era, Album, Tour, Swiftter, Post, Member) is defined in [`CONTEXT.md`](CONTEXT.md), and design decisions are recorded in [`docs/adr/`](docs/adr/).

## Stack

- [Next.js 14](https://nextjs.org/) (App Router), React 18, TypeScript
- [NextUI 2](https://nextui.org/) on [Tailwind CSS 3](https://tailwindcss.com/)
- [Clerk](https://clerk.com/) for sign-in
- [Cloudinary](https://cloudinary.com/) (via `next-cloudinary`) for Tour images, videos and backgrounds
- [Deezer API](https://developers.deezer.com/api) for the Album catalogue (no credentials needed)
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) for the Tours timeline
- [Playwright](https://playwright.dev/) for the smoke tests

Deployed on Vercel: `main` is production, every branch gets a preview.

## Getting started

Requires Node 22.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

[`.env.example`](.env.example) lists every environment variable the app reads, with what each is for.

## Checks

```bash
npm run lint        # ESLint (via next lint)
npm run typecheck   # tsc --noEmit
npm run test:e2e    # Playwright smoke suite
```

`npm run test:e2e` builds the app and starts it on port 3100 (or reuses a server already listening there), then drives it as a black box: every route renders with no page errors and no console errors or warnings, the nav highlights the current page, Music loads Albums and tracklists, and the Tours timeline scrolls end to end. The first run needs a browser: `npx playwright install chromium`.

## CI

[GitHub Actions](.github/workflows/ci.yml) runs lint, typecheck, build and the Playwright suite on every pull request and on pushes to `dev`. The environment variables come from repository secrets. On failure the Playwright report and traces are uploaded as an artifact.

## Seeding

Swiftter's demo Posts will be seeded once its Neon database lands in #12; nothing to seed yet.
