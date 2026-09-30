import type { Metadata } from "next";

import { alt as cardAlt, contentType as cardType, size as cardSize } from "@/app/opengraph-image";
import { siteConfig } from "@/config/site";

import { CATALOGUE, type CatalogueAlbum, findAlbum } from "./catalogue";

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
};

/**
 * A page's metadata: title, description, canonical link and Open Graph card.
 * og:title and og:description follow the page's own title and description.
 */
export function pageMetadata({ title, description, path, noindex }: PageMetadataOptions): Metadata {
  return {
    ...(title && { title }),
    ...(description && { description }),
    alternates: { canonical: path },
    openGraph: { ...OPEN_GRAPH, url: path, images: [CARD] },
    ...(noindex && { robots: { index: false, follow: false } }),
  };
}

/** A path as an absolute URL on the site: "/tours" → "https://www.taylorssecretgarden.com/tours". */
export function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).href;
}

/** An Album's page on Music. The first Album is the one /music opens on, so its page is /music. */
export function albumPath(album: CatalogueAlbum): string {
  return album === CATALOGUE[0] ? "/music" : `/music?album=${album.id}`;
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

  return version ? `/music?album=${version.id}` : albumPath(album);
}
