# SEO strategy

How www.taylorssecretgarden.com gets found: by search engines, and by AI assistants that answer questions from the web (GEO). It is built only from what the site already holds (the catalogue in `lib/catalogue.ts`, the Eras in `lib/eras.ts`, the Tours in `public/json/tours.json`, Swiftter) and from the vocabulary in [`CONTEXT.md`](CONTEXT.md).

This document contains no traffic, ranking, impression or search-volume figures, and no estimates of any. The site has no search data yet. Once Search Console has some, decisions should rest on it, and on nothing invented.

## Where things stand

In place (the visibility foundations, V1 to V8 of the roadmap):

- **One address.** `https://www.taylorssecretgarden.com` is the canonical origin (`config/site.ts`). The apex already redirects to www. Every route declares its canonical URL, and `og:url`, Open Graph and X cards (`pageMetadata`, `lib/metadata.ts`).
- **Indexing only in production** (`lib/indexing.ts`). On Vercel production, `robots.txt` allows everything and lists the sitemap. Everywhere else (previews, local, CI), `robots.txt` disallows everything, pages say `noindex, nofollow`, and every response carries `X-Robots-Tag: noindex, nofollow`. The guestbook (`/sign-in`, `/sign-up`) and the styleguide are `noindex` everywhere.
- **A generated sitemap** (`app/sitemap.ts`): Home, Music and each Album's page, Tours and each Tour's page, Swiftter. There is a marked extension point for Swiftter's Post pages.
- **Structured data** (`components/json-ld.tsx`): `WebSite` on Home, `MusicAlbum` for the open Album on Music, an `ItemList` of Tours, and an `EventSeries` per Tour (its years only, because the data holds no show dates).
- **`/llms.txt`**, generated from the catalogue, the Tours data and the site config: what the site is, its sections, every Album by Era, every Tour.
- **Accessibility gate.** axe runs at WCAG 2.2 AA, every page has exactly one h1, and Lighthouse CI covers the guestbook too.

Known gaps:

- `taylorssecretgarden.vercel.app` redirects its pages to www permanently (308, path and query kept); its API routes keep answering there (`next.config.ts`).
- Music's h1 is the journal's playful line ("pick an Era. the page changes outfits."), the same on every Album page. The Album's title is only an h2.
- Album pages are query-string URLs (`/music?album=<Deezer ID>`). They work and are canonical, but the ID says nothing to a reader of search results.
- Nothing on the site links an Album to its Era's Tour, or the other way round.
- The Tour facts carry no sources on the page.
- Swiftter Posts have no pages of their own yet, so there is nothing of Swiftter to index beyond the feed.

## Topic clusters

Each cluster has a hub, which is the page that should rank for the broad topic, and spokes, the pages that answer specific questions. The query themes below describe the kinds of questions the site's content already answers. They are not measured demand.

### 1. Albums and tracklists

- **Hub:** `/music`
- **Spokes:** each Album's page (`/music?album=<id>`), with its tracklist, running times, label, release date and 30-second previews.
- **Query themes:** "<Album> tracklist", "<Album> release date", "how long is <Album>", "songs on <Album> deluxe".
- **Gap:** the page's text leads with the Era's look rather than the Album. A short factual line (Album, release date, edition, number of tracks) near the title would answer these questions directly (V9).

### 2. Taylor's Versions (the re-recordings)

- **Hub:** none yet.
- **Spokes:** the four Taylor's Version pages (Fearless, Speak Now, Red, 1989), each tied to its original in the catalogue (`reRecords`).
- **Query themes:** "which albums has Taylor Swift re-recorded", "<Album> Taylor's Version vs original", "<Album> Taylor's Version release date".
- **Gap:** no page brings the re-recordings together, and an Album page does not link to its original or re-recording in text. A "Taylor's Versions" section or page, generated from `reRecords`, would be the hub.

### 3. Album Versions and editions

- **Hub:** each Album's page, whose row of Versions links to them.
- **Spokes:** each Version's page (`/music?album=<version id>`): standard and deluxe editions, the 3am and Til Dawn editions of Midnights, The Anthology, the "Chapter" compilations, the live and acoustic albums.
- **Query themes:** "<Album> 3am edition tracklist", "<Album> standard vs deluxe", "<Chapter name> tracklist".
- **Note:** Versions are canonical to themselves because each has its own tracklist. The sitemap leaves them out; they are reached through their Album's page.

### 4. Eras

- **Hub:** none yet. Home's pressed-flower gallery is the closest thing.
- **Content already held for each Era** (`lib/eras.ts`): its name, year, palette, flower, a fan note, its Albums and its Tour.
- **Query themes:** "Taylor Swift <Era> era", "what are Taylor Swift's eras", "Taylor Swift eras in order".
- **Gap:** an Era exists only as a look. It has no page and no text that names it as a topic. Era pages generated from existing data (see the backlog) would make this cluster real.

### 5. Tours

- **Hub:** `/tours`
- **Spokes:** each Tour's page (`/tours/<slug>`), with its years, number of shows, legs, facts, poster and footage.
- **Query themes:** "<Tour> years", "how many shows was <Tour>", "<Tour> opening acts", "Eras Tour facts".
- **Gap:** the facts carry no sources, and no Tour page links to its Era's Albums.

### 6. The fan feed (Swiftter)

- **Hub:** `/swiftter`
- **Spokes:** Post pages, once they exist.
- **Query themes:** fan theories, easter eggs, reactions to a release. The Members write this content, not the site.
- **Risk:** short, user-written Posts make thin pages. Only public Posts (published, not torn up, not seed fixtures) should be indexable, and only once a quality bar is agreed (see the backlog).

## Content architecture

| URL | Role | Indexed | Canonical | Structured data |
| --- | --- | --- | --- | --- |
| `/` | Hub of hubs | yes | itself | `WebSite` |
| `/music` | Albums hub; opens on the first Album | yes | itself | `MusicAlbum` (the open Album) |
| `/music?album=<Album ID>` | An Album | yes | the Album's catalogue ID (regional twins and old IDs point here) | `MusicAlbum` |
| `/music?album=<Version ID>` | A Version of an Album | yes, not in the sitemap | itself | `MusicAlbum` (its Album) |
| `/tours` | Tours hub | yes | itself | `ItemList` of Tours |
| `/tours/<slug>` | A Tour | yes | itself | `EventSeries` |
| `/swiftter` | The fan feed | yes | itself | none yet |
| `/swiftter/<post>` (future) | A Post | public Posts only | itself (it must set its own; the Swiftter layout's canonical is the feed's) | `DiscussionForumPosting` |
| `/sign-in`, `/sign-up` | The guestbook | no (`noindex`) | itself, without `redirect_url` | none |
| `/styleguide` | Development only; 404 in production | no | itself | none |
| `/robots.txt`, `/sitemap.xml`, `/llms.txt` | For crawlers and assistants | n/a | n/a | n/a |

Rules that keep this consistent:

- Every indexable page gets its metadata from `pageMetadata` (title, description, canonical, Open Graph). A new route that skips it inherits the layout's defaults and has no canonical link.
- Canonical URLs, the sitemap, JSON-LD and `llms.txt` are all generated from the same data (the catalogue, the Tours data, `config/site.ts`), so they cannot disagree with each other.
- A page that should not be found passes `noindex: true`. Nothing is blocked in `robots.txt` in production: a crawler has to fetch a page to see its `noindex`.

## Internal linking plan

Links today: the four-tab nav on every page; Home to Music, Tours and Swiftter, each Era's pressed flower to its Album, and each Tour poster to its page; the Music shelf to every Album, and an Album to its Versions; Tours to each Tour page, and back.

To add, in order of value:

1. **Tour page → its Era's Albums.** For example, the Red Tour links to Red and to Red (Taylor's Version). The Eras Tour, which spans every Era, links to the Music shelf. The data is already there: `tour.era`, then `CATALOGUE`.
2. **Album page → its Era's Tour**, when there is one (the reverse of 1).
3. **Taylor's Version ↔ original,** in text: "a re-recording of Fearless (2008)" and "re-recorded as Fearless (Taylor's Version)", each linking to the other's page.
4. **Era hub pages**, once they exist (backlog): Home's pressed flowers, each Album and each Tour link to their Era.
5. **Swiftter Posts → the Albums and Tours they mention,** once Post pages exist, only where a Post names one exactly.

Anchor text names the destination ("Red (Taylor's Version) tracklist", "The Red Tour"), never "click here". Every link stays a real `<a href>` (`Link` and `IntentLink` render one), so crawlers can follow it.

## GEO: being quoted by AI assistants

- **Answer first.** `/llms.txt` opens with what the site is, then its facts. Page intros should do the same: one factual sentence before the scrapbook voice (V9).
- **One source of truth.** The same facts appear on the page, in the JSON-LD, the sitemap and `llms.txt`, all generated from the catalogue and the Tours data. Correct the data, and every surface follows.
- **Say what the site is.** Every surface says it is an unofficial fan site, the same way every time. Assistants quote that framing.
- **Cite sources.** Linking each Tour fact to a public source (a news report, an official announcement) makes it checkable. This is on the backlog.

## Pre-launch indexing checklist

Do these in this order. Steps 2 and 3 must not be swapped: redirecting to www before Neon Auth trusts it breaks signing in.

1. ✅ (v0.1.0, 2026-09-30) **Ship the foundations to production.** Merge the visibility PR into `dev`, then release `dev` → `main`. On production, check:
   - `curl -sI https://www.taylorssecretgarden.com/ | grep -i x-robots-tag` prints nothing.
   - `curl -s https://www.taylorssecretgarden.com/robots.txt` shows `Allow: /` and `Sitemap: https://www.taylorssecretgarden.com/sitemap.xml`.
   - `https://www.taylorssecretgarden.com/sitemap.xml` lists only `https://www.taylorssecretgarden.com/...` URLs.
   - The page source of `/` has `<link rel="canonical" href="https://www.taylorssecretgarden.com"/>` and no `<meta name="robots" content="noindex`.
   - `/sign-in` still says `noindex`.
   - A preview deployment answers `X-Robots-Tag: noindex, nofollow`, and its `robots.txt` says `Disallow: /`.
   - These signals are decided at build time, from `VERCEL_ENV`. After any promotion or rollback, check the header again.
2. ✅ (2026-09-30) **Add www and the apex to Neon Auth's trusted domains.** In the Neon console, on the production branch's Auth settings, add `https://www.taylorssecretgarden.com` and `https://taylorssecretgarden.com`. If Google sign-in uses its own OAuth client, add the www origin and callback URL there too. Then, on www, test signing up, signing in (email and Google) and signing out.
3. ✅ (in `next.config.ts`, pages only) **Only then, redirect `taylorssecretgarden.vercel.app` to www.** Use a permanent (308) redirect that keeps the path and query. Either use a `redirects()` rule in `next.config.ts` with `has: [{ type: "host", value: "taylorssecretgarden.vercel.app" }]`, which lives in the repo and can be tested, or use Vercel's domain settings if they offer it for that domain. Check that `/api/auth/*` and the Google callback still work after the redirect.
4. **Check deployment protection.** Confirm that Vercel's Deployment Protection covers the generated deployment URLs (`taylorssecretgarden-<hash>-….vercel.app`). Production builds are indexable wherever they are served; their canonical links point to www either way.
5. **Google Search Console.** Add the site: a Domain property for `taylorssecretgarden.com` (DNS TXT record, an owner action), or a URL-prefix property for `https://www.taylorssecretgarden.com/`. `public/googlea23a831c6a4ad51a.html` is already served from every host, so check which property it verifies.
6. **Submit the sitemap:** `https://www.taylorssecretgarden.com/sitemap.xml`, under Sitemaps.
7. **Inspect key URLs.** Use URL Inspection's live test on `/`, `/music`, one Album page, `/tours`, one Tour page and `/swiftter`. Each should be indexable, with Google's chosen canonical matching the declared one. Then request indexing for Home.
8. **Validate the structured data** with the Schema Markup Validator (validator.schema.org) on `/`, an Album page and a Tour page. `MusicAlbum` and `EventSeries` are not among Google's rich-result types, so the Rich Results Test may not show them. The validator checks that they are well formed.
9. **Bing Webmaster Tools.** Import the site from Search Console, then submit the same sitemap.
10. **The vercel.app property.** If `taylorssecretgarden.vercel.app` was ever verified in Search Console, check whether the Change of Address tool accepts it once the redirect is live. Otherwise, the 308 and the canonical links do the job.
11. **Watch the first crawls.** In Search Console, the Pages report (indexed, and why anything is excluded) and the Core Web Vitals report. In CI, Lighthouse keeps Accessibility at 0.9 or above.

## Backlog, in priority order

| P | Item | Why | Done when |
| --- | --- | --- | --- |
| P0 | The checklist above | Nothing is found until production is indexable at one address | Search Console shows the sitemap read, and the key URLs indexable with the declared canonical |
| P1 | Answer-first intros on Music and Tours (V9) | Search snippets and assistants quote the first factual sentence | Each Album page opens with a sentence naming the Album, its release date and its edition; Tours with one naming the Tours |
| P1 | Internal links: Tour ↔ Era's Albums, Taylor's Version ↔ original | Connects clusters 1, 2 and 5; passes crawl paths between hubs | Every Tour page links its Era's Albums, and every re-recording links its original and back (tested) |
| P1 | Swiftter Post pages: own canonical, `DiscussionForumPosting` JSON-LD, sitemap entries for public Posts only | Makes cluster 6 indexable without leaking pending, refused or torn-up notes | The sitemap extension point is filled; a test proves non-public Posts are absent and `noindex` |
| P1 | A quality bar for indexing Posts | Avoids thin pages | The owner sets the rule (e.g. a minimum length, or no seed and demo content); Posts below it are `noindex` |
| P2 | Era hub pages (`/eras/<slug>`) from `lib/eras.ts` and the catalogue | Gives cluster 4 a page; links Albums and Tours by Era | Every Era has a page with its Albums, its Tour and its fan note, in the sitemap and `llms.txt` |
| P2 | A Taylor's Versions page generated from `reRecords` | Hub for cluster 2 | Lists each re-recording beside its original, with release dates |
| P2 | Sources for the Tour facts | Trust and checkability, for readers and assistants | Each fact in `tours.json` has a source URL, shown on its Tour page |
| P2 | The open Album's title in Music's h1 | The h1 would say what the page is about | Decided with the owner (the playful line is part of the design) |
| P2 | Path-based Album URLs (`/music/<album-slug>`) | Readable URLs in results | Owner decision (a URL change): 308s from `?album=`, canonicals, sitemap and `llms.txt` updated together |
| P2 | Open Graph cards per Album or Tour, in the Era's palette | Richer link previews when shared | Generated with `next/og`; no cover art unless its licence allows it |
| P2 | `og:locale` from `en` to a language and territory (e.g. `en_US`) | Open Graph expects `language_TERRITORY` | Owner decides the audience |

Measure outcomes only from real data: Search Console (pages indexed, and later the queries and pages that actually appear) and Bing Webmaster Tools. Re-rank this backlog from that data, not from guesses.
