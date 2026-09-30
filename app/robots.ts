import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { isIndexable, robotsFile } from "@/lib/indexing";

/** /robots.txt: open to crawlers in production only (lib/indexing.ts). */
export default function robots(): MetadataRoute.Robots {
  return robotsFile(isIndexable(), siteConfig.url);
}
