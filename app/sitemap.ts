import type { MetadataRoute } from "next";

import tours from "@/public/json/tours.json";
import { CATALOGUE } from "@/lib/catalogue";
import { absoluteUrl, albumPath } from "@/lib/metadata";
import { listSitemapPosts } from "@/service/swiftter";

/*
  /sitemap.xml, generated from the site's own data at build time: every page
  that may be indexed, at its canonical URL (lib/metadata.ts). Not listed:
  the guestbook and the styleguide (noindex), the API, an Album's other
  Versions (each linked from its Album's page), and Swiftter's seed, demo,
  held and torn-up notes.

  The Tours come straight from their data file: lib/tours.ts brings in the
  Era looks and their next/font faces, which a metadata route cannot load.
*/
export const revalidate = 3600;

/**
 * Swiftter's public threads (real Members' Posts: no seed or demo content, no
 * replies, nothing held or torn up) that meet the indexing bar (a first Post
 * of 140 visible characters, or a public reply), newest first. A build without a database
 * (locally) lists none rather than failing; the hourly revalidation adds them.
 */
async function threadPaths(): Promise<MetadataRoute.Sitemap> {
  try {
    return (await listSitemapPosts()).map(({ id, publishedAt }) => ({ url: absoluteUrl(`/swiftter/p/${id}`), lastModified: publishedAt }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Sitemap without Swiftter threads:", error instanceof Error ? error.message : error);

    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = [
    "/",
    // Music opens on the first Album; every other Album has a page of its own.
    ...new Set(CATALOGUE.map(albumPath)),
    "/tours",
    ...tours.map(({ slug }) => `/tours/${slug}`),
    "/swiftter",
  ];

  return [...paths.map((path) => ({ url: absoluteUrl(path) })), ...(await threadPaths())];
}
