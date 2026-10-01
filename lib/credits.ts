/*
  Where the scrapbook's pictures and footage come from (issue #119). The
  photos are free-licensed concert photos from Wikimedia Commons, each
  credited the way its licence asks: author, licence (linked), source and
  what was changed. The Eras Tour trailer is embedded from Taylor Swift's
  official YouTube channel, not copied.
*/

/** A picture's or a piece of footage's source: what it is, whose it is, on what terms. */
export type Credit = {
  /** What the picture is, for the Credits page. */
  work: string;
  /** Who made it or holds its rights, as they ask to be credited. */
  author: string;
  /** The terms it is published under: an open licence's short name ("CC BY 2.0"), or "All rights reserved". */
  licence: string;
  /** The licence's deed, for an open licence. */
  licenceUrl?: string;
  /** What this copy changes from the original, which Creative Commons licences ask to be said ("Cropped and resized"). */
  changes?: string;
  /** Where it was published, when that is known. */
  url?: string;
};

/**
 * The home page's photo (also on the Open Graph card): the folklore set of
 * the Eras Tour, cropped to a 4:5 print around Taylor (public/img/home.jpg).
 */
export const HOME_PHOTO = {
  src: "/img/home.jpg",
  alt: "Taylor Swift twirling in the flowing blue folklore dress on the Eras Tour stage",
  size: [1100, 1375],
  credit: {
    work: "The Eras Tour, SoFi Stadium, Inglewood, 9 August 2023: the folklore set",
    author: "Paolo V",
    licence: "CC BY 2.0",
    licenceUrl: "https://creativecommons.org/licenses/by/2.0/",
    changes: "Cropped and resized",
    url: "https://commons.wikimedia.org/wiki/File:Taylor_Swift_The_Eras_Tour_The_Folklore_Set_Era_(53109914795).jpg",
  },
} as const satisfies { src: string; alt: string; size: readonly [number, number]; credit: Credit };
