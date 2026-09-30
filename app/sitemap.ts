import type { MetadataRoute } from "next";

import tours from "@/public/json/tours.json";
import { CATALOGUE } from "@/lib/catalogue";
import { absoluteUrl, albumPath } from "@/lib/metadata";

/*
  /sitemap.xml, generated from the site's own data at build time: every page
  that may be indexed, at its canonical URL (lib/metadata.ts). Not listed:
  the guestbook and the styleguide (noindex), the API, and an Album's other
  Versions (each linked from its Album's page).

  The Tours come straight from their data file: lib/tours.ts brings in the
  Era looks and their next/font faces, which a metadata route cannot load.
*/
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    // Music opens on the first Album; every other Album has a page of its own.
    ...new Set(CATALOGUE.map(albumPath)),
    "/tours",
    ...tours.map(({ slug }) => `/tours/${slug}`),
    "/swiftter",
    // EXTENSION POINT: Swiftter's Post pages. When a Post gets a page of its
    // own, list the public ones here (published, not torn up, not seed
    // fixtures), each at its canonical path. That needs a database query,
    // so this function becomes async and the file gets a `revalidate` so new
    // Posts appear without a deploy. Nothing reads the database here yet.
  ];

  return paths.map((path) => ({ url: absoluteUrl(path) }));
}
