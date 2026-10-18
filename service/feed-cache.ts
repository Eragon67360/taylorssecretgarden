import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import { listFeed } from "@/service/swiftter";

/*
  The first page of Swiftter's feed, cached: the same for everyone (no
  Member's own data is ever in it: that comes from /api/swiftter/me), so the
  /swiftter page and the feed route read it from Next's data cache rather
  than the database on every visit.

  unstable_cache rather than "use cache": the latter needs Cache Components
  (`cacheComponents` in next.config), which changes how every route renders;
  not worth turning on for one cached query.
*/

/** The tag on the cached first page: invalidated by every public change. */
export const FEED_TAG = "swiftter-feed";

/**
 * The feed's first page. Invalidated by `feedChanged()`; the hour's
 * revalidation is a safety net for changes made outside the app (a note
 * approved by hand, ADR-0007; the seed scripts). An hour, not a minute: Neon
 * suspends the database after 5 idle minutes, and an uptime check or a bot
 * reading the feed every few minutes kept it awake around the clock, past the
 * free plan's 100 CU-hours a month (October 2026).
 */
export const getFirstFeedPage = unstable_cache(() => listFeed(), ["swiftter-first-feed-page"], { tags: [FEED_TAG], revalidate: 3600 });

/**
 * Something public changed (a note approved, by a Member's write, "check
 * again" or the cron; a note torn up; a reshare or its undoing): the next
 * read of the first page waits for fresh data. `expire: 0` rather than
 * "max": a Member who reloads after passing a note must see it, not the
 * page from before. Route Handlers only (it needs a request's context).
 */
export function feedChanged() {
  revalidateTag(FEED_TAG, { expire: 0 });
}
