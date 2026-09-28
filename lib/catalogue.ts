import type { EraSlug } from "./eras";

/*
  The catalogue: every studio Album and every Taylor's Version, in Era order,
  each Taylor's Version right after the Album it re-records (see CONTEXT.md).
  It drives the albums API, the Music shelf and the Home herbarium.

  An Album is shown in its most complete edition on Deezer (not a karaoke,
  live, acoustic-collection or commentary release). Deezer's `release_date`
  is sometimes the edition's, sometimes wrong (the debut's deluxe says 2008),
  so each Album keeps its real release date here. Every ID was checked against
  https://api.deezer.com/album/<id> on 2026-09-28.
*/

export type CatalogueAlbum = {
  /** The Deezer ID of the edition shown. */
  id: string;
  era: EraSlug;
  /** The Album's title as fans write it, without edition or "(Taylor's Version)". */
  title: string;
  /** The edition shown, when it is not the standard one. */
  edition?: string;
  /** The Album's original release date (not the edition's). */
  released: string;
  /** For a Taylor's Version: the ID of the Album it re-records. */
  reRecords?: string;
  /**
   * Other Deezer IDs for the same Album (its other editions and regional
   * twins), so an old or regional link still finds it.
   */
  aliases?: string[];
};

export const CATALOGUE: readonly CatalogueAlbum[] = [
  { id: "227786", era: "debut", title: "Taylor Swift", edition: "Deluxe Edition", released: "2006-10-24", aliases: ["874936972", "81389452"] },
  { id: "426350", era: "fearless", title: "Fearless", edition: "Platinum Edition", released: "2008-11-11", aliases: ["283925", "81389432"] },
  { id: "221543452", era: "fearless", title: "Fearless", released: "2021-04-09", reRecords: "426350" },
  { id: "689149", era: "speak-now", title: "Speak Now", edition: "Deluxe Edition", released: "2010-10-25", aliases: ["689148"] },
  { id: "461146065", era: "speak-now", title: "Speak Now", released: "2023-07-07", reRecords: "689149" },
  { id: "68491961", era: "red", title: "Red", edition: "Deluxe Edition", released: "2012-10-22", aliases: ["68496491", "130721292"] },
  { id: "272247412", era: "red", title: "Red", released: "2021-11-12", reRecords: "68491961" },
  { id: "9007781", era: "1989", title: "1989", edition: "Deluxe Edition", released: "2014-10-27", aliases: ["9007779"] },
  { id: "505316961", era: "1989", title: "1989", edition: "Deluxe Edition", released: "2023-10-27", reRecords: "9007781", aliases: ["504180521"] },
  { id: "52612062", era: "reputation", title: "reputation", released: "2017-11-10" },
  { id: "108447472", era: "lover", title: "Lover", released: "2019-08-23" },
  { id: "167766152", era: "folklore", title: "folklore", edition: "Deluxe Edition", released: "2020-07-24", aliases: ["162683632"] },
  { id: "198167862", era: "evermore", title: "evermore", edition: "Deluxe Edition", released: "2020-12-11", aliases: ["192580112"] },
  {
    id: "446218925",
    era: "midnights",
    title: "Midnights",
    edition: "The Til Dawn Edition",
    released: "2022-10-21",
    aliases: ["368474187", "368474237", "368506677"],
  },
  {
    id: "575252501",
    era: "ttpd",
    title: "The Tortured Poets Department",
    edition: "The Anthology",
    released: "2024-04-19",
    aliases: ["574109801"],
  },
  { id: "1103662682", era: "showgirl", title: "The Life of a Showgirl", edition: "The Encore", released: "2025-10-03", aliases: ["829966251", "852049722", "835672072"] },
];

/** Whether an Album is a Taylor's Version re-recording. */
export const isTaylorsVersion = (album: CatalogueAlbum) => album.reRecords !== undefined;

/** "Fearless (Taylor's Version)": the Album's name, without its edition. */
export const albumName = (album: CatalogueAlbum) => (isTaylorsVersion(album) ? `${album.title} (Taylor's Version)` : album.title);

/** The year the Album was first released. */
export const albumYear = (album: CatalogueAlbum) => Number(album.released.slice(0, 4));

/** The catalogue Album a Deezer ID stands for: its own, one of its aliases, or none. */
export function findAlbum(id: string | undefined): CatalogueAlbum | undefined {
  return id ? CATALOGUE.find((album) => album.id === id || album.aliases?.includes(id)) : undefined;
}

/** The Album that stands for an Era: its Taylor's Version when there is one (the one we stream). */
export function eraAlbum(era: EraSlug): CatalogueAlbum {
  return CATALOGUE.findLast((album) => album.era === era)!;
}
