import type { Metadata } from "next";

import { alt as cardAlt, contentType as cardType, size as cardSize } from "@/app/opengraph-image";
import { siteConfig } from "@/config/site";

import { albumPath, findAlbum, versionPath } from "./catalogue";

// Album and Version paths live with the catalogue, so client components can build links without this module.
export { albumPath, versionPath };

/*
  Every page's metadata: its canonical URL and the Open Graph card link
  previews show (X's card follows it). Paths stay relative: the root layout's
  `metadataBase` (siteConfig.url) makes them absolute, on
  www.taylorssecretgarden.com in production.
*/

/** What every page's Open Graph shares, the root layout's included. */
export const OPEN_GRAPH = { type: "website", siteName: siteConfig.name, locale: "en" } as const;

/**
 * The link-preview card (app/opengraph-image.tsx). Next adds the file's card
 * only to pages without Open Graph fields of their own, and every page sets
 * its own og:url, so each names the card too.
 */
const CARD = { url: "/opengraph-image", alt: cardAlt, width: cardSize.width, height: cardSize.height, type: cardType };

type PageMetadataOptions = {
  /** The page's title (the layout adds the site's name); none keeps the site's own. */
  title?: string;
  /** None keeps the site's description. */
  description?: string;
  /** The page's canonical path: "/tours/the-eras-tour", "/music?album=221543452". */
  path: string;
  /** Kept out of search results (the guestbook, the styleguide). */
  noindex?: boolean;
  /** An article (a Swiftter thread): its Open Graph type is "article", with when it was published. */
  article?: { publishedTime: string };
};

/**
 * A page's metadata: title, description, canonical link and Open Graph card.
 * og:title and og:description follow the page's own title and description.
 */
export function pageMetadata({ title, description, path, noindex, article }: PageMetadataOptions): Metadata {
  return {
    ...(title && { title }),
    ...(description && { description }),
    alternates: { canonical: path },
    openGraph: article
      ? { ...OPEN_GRAPH, type: "article", publishedTime: article.publishedTime, url: path, images: [CARD] }
      : { ...OPEN_GRAPH, url: path, images: [CARD] },
    ...(noindex && { robots: { index: false, follow: false } }),
  };
}

/** A path as an absolute URL on the site: "/tours" → "https://www.taylorssecretgarden.com/tours". */
export function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).href;
}

/**
 * Music's canonical path for `?album=<id>`: the Album's page, whichever of its
 * Deezer IDs asked for it (a regional twin, an old link), or the Version's own
 * when one of its Versions is open (another tracklist). Any other value opens
 * the first Album: /music.
 */
export function musicPath(wanted: string | undefined): string {
  const album = findAlbum(wanted);

  if (!album) return "/music";
  const version = album.versions?.find(({ id }) => id === wanted);

  return version ? versionPath(version) : albumPath(album);
}
