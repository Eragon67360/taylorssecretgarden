import type { MetadataRoute } from "next";

/*
  Whether search engines may index this deployment, decided once: only
  Vercel's production does (www.taylorssecretgarden.com). Previews, a local
  `next start` and CI stay out of search results three ways: robots.txt
  disallows everything (app/robots.ts), every page says
  `noindex, nofollow` (app/layout.tsx), and so does every response's
  X-Robots-Tag header (next.config.ts).

  Pure and without path aliases: next.config.ts imports it before the app's
  build exists. All three are decided at build time, where Vercel sets
  VERCEL_ENV too.
*/

/** Whether this deployment may be indexed: Vercel production only. */
export function isIndexable(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL_ENV === "production";
}

/** The header that keeps any response of a deployment that may not be indexed out of search results. */
export const NOINDEX_HEADER = { key: "X-Robots-Tag", value: "noindex, nofollow" };

/** robots.txt: everything allowed and the sitemap listed in production, everything disallowed elsewhere. */
export function robotsFile(indexable: boolean, siteUrl: string): MetadataRoute.Robots {
  return indexable ? { rules: { userAgent: "*", allow: "/" }, sitemap: `${siteUrl}/sitemap.xml` } : { rules: { userAgent: "*", disallow: "/" } };
}
