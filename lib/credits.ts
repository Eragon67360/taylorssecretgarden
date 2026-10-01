/*
  Where the scrapbook's pictures and footage come from (issue #119). Only
  what could be traced is recorded: a picture with no Credit has no known
  source yet, and none is guessed for it.
*/

/** A picture's or a piece of footage's source: what it is, whose it is, on what terms. */
export type Credit = {
  /** What the picture is, for the Credits page. */
  work: string;
  /** Who made it or holds its rights, as they ask to be credited. */
  author: string;
  /** The terms it is published under ("All rights reserved" unless an open licence says otherwise). */
  licence: string;
  /** Where it was published, when that is known. */
  url?: string;
};
