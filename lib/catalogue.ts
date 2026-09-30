import type { EraSlug } from "./eras";

/*
  The catalogue: every studio Album and every Taylor's Version, in Era order,
  each Taylor's Version right after the Album it re-records (see CONTEXT.md).
  It drives the albums API, the Music shelf and the Home herbarium.

  Each Album also lists its other versions on Deezer (standard edition,
  international, live, acoustic, sessions, "Chapter" compilations), which the
  Music page offers once the Album is open. Releases deliberately left out
  (karaoke, playlists, single bundles) are in IGNORED_RELEASES, so the weekly
  check (scripts/check-releases.ts) only reports what is really new.

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
  /** Its other versions on Deezer, in release order. */
  versions?: AlbumVersion[];
  /**
   * Other Deezer IDs for the Album (regional twins, same barcode, and regional editions), so an old or
   * regional link still finds it.
   */
  aliases?: string[];
};

/** Another version of an Album on Deezer: another edition, a live or acoustic album, a compilation. */
export type AlbumVersion = {
  id: string;
  /** How fans call it: "Standard Edition", "3am Edition", "The Long Pond Studio Sessions". */
  name: string;
  /** Its own release date. */
  released: string;
};

export const CATALOGUE: readonly CatalogueAlbum[] = [
  {
    id: "227786",
    era: "debut",
    title: "Taylor Swift",
    edition: "Deluxe Edition",
    released: "2006-10-24",
    versions: [{ id: "874936972", name: "Standard Edition", released: "2006-10-24" }],
    aliases: ["81389452", "72093192", "321177137"],
  },
  {
    id: "426350",
    era: "fearless",
    title: "Fearless",
    edition: "Platinum Edition",
    released: "2008-11-11",
    versions: [
      // The US release, seen from Deezer's US catalogue only.
      { id: "130714702", name: "Standard Edition", released: "2008-11-11" },
      { id: "283925", name: "International Version", released: "2009-03-09" },
      { id: "142920532", name: "Live From Clear Channel Stripped 2008", released: "2020-04-24" },
    ],
    aliases: ["81389432", "272284", "130714712"],
  },
  {
    id: "221543452",
    era: "fearless",
    title: "Fearless",
    released: "2021-04-09",
    reRecords: "426350",
    versions: [{ id: "418639447", name: "The More Fearless (Taylor's Version) Chapter", released: "2023-03-17" }],
  },
  {
    id: "689149",
    era: "speak-now",
    title: "Speak Now",
    edition: "Deluxe Edition",
    released: "2010-10-25",
    versions: [
      { id: "689148", name: "Standard Edition", released: "2010-10-25" },
      { id: "320370867", name: "Speak Now World Tour Live", released: "2011-11-21" },
    ],
    aliases: ["130716982", "130716972"],
  },
  { id: "461146065", era: "speak-now", title: "Speak Now", released: "2023-07-07", reRecords: "689149" },
  {
    id: "68491961",
    era: "red",
    title: "Red",
    edition: "Deluxe Edition",
    released: "2012-10-22",
    versions: [{ id: "68496491", name: "Standard Edition", released: "2012-10-22" }],
    aliases: ["130721292", "130716962"],
  },
  {
    id: "272247412",
    era: "red",
    title: "Red",
    released: "2021-11-12",
    reRecords: "68491961",
    versions: [
      { id: "286778242", name: "Could You Be The One Chapter", released: "2022-01-13" },
      { id: "287187352", name: "She Wrote A Song About Me Chapter", released: "2022-01-18" },
      { id: "288395152", name: "The Slow Motion Chapter", released: "2022-01-25" },
      { id: "289970772", name: "From The Vault Chapter", released: "2022-01-31" },
      { id: "417939037", name: "The More Red (Taylor's Version) Chapter", released: "2023-03-17" },
    ],
  },
  {
    id: "9007781",
    era: "1989",
    title: "1989",
    edition: "Deluxe Edition",
    released: "2014-10-27",
    versions: [{ id: "9007779", name: "Standard Edition", released: "2014-10-27" }],
    aliases: ["72335572", "302068167"],
  },
  {
    id: "505316961",
    era: "1989",
    title: "1989",
    edition: "Deluxe Edition",
    released: "2023-10-27",
    reRecords: "9007781",
    versions: [{ id: "504180521", name: "Standard Edition", released: "2023-10-27" }],
  },
  { id: "52612062", era: "reputation", title: "reputation", released: "2017-11-10" },
  {
    id: "108447472",
    era: "lover",
    title: "Lover",
    released: "2019-08-23",
    versions: [{ id: "418639457", name: "The More Lover Chapter", released: "2023-03-17" }],
  },
  {
    id: "167766152",
    era: "folklore",
    title: "folklore",
    edition: "Deluxe Edition",
    released: "2020-07-24",
    versions: [
      { id: "162683632", name: "Standard Edition", released: "2020-07-24" },
      { id: "188803732", name: "The Long Pond Studio Sessions", released: "2020-11-25" },
    ],
  },
  {
    id: "198167862",
    era: "evermore",
    title: "evermore",
    edition: "Deluxe Edition",
    released: "2020-12-11",
    versions: [{ id: "192580112", name: "Standard Edition", released: "2020-12-11" }],
  },
  {
    id: "446218925",
    era: "midnights",
    title: "Midnights",
    edition: "The Til Dawn Edition",
    released: "2022-10-21",
    versions: [
      { id: "368474187", name: "Standard Edition", released: "2022-10-21" },
      { id: "368506677", name: "3am Edition", released: "2022-10-21" },
    ],
    aliases: ["368474237"],
  },
  {
    id: "575252501",
    era: "ttpd",
    title: "The Tortured Poets Department",
    edition: "The Anthology",
    released: "2024-04-19",
    versions: [{ id: "574109801", name: "Standard Edition", released: "2024-04-19" }],
  },
  {
    id: "1103662682",
    era: "showgirl",
    title: "The Life of a Showgirl",
    edition: "The Encore",
    released: "2025-10-03",
    versions: [
      { id: "829966251", name: "Standard Edition", released: "2025-10-03" },
      { id: "835672072", name: "Track by Track Version", released: "2025-10-07" },
      { id: "852049722", name: "+ Acoustic Collection", released: "2025-11-07" },
    ],
  },
];

/**
 * Taylor's albums and EPs on Deezer deliberately not in the catalogue, with
 * why, so the weekly check (scripts/check-releases.ts) does not report them.
 */
export const IGNORED_RELEASES: readonly { id: string; title: string; why: string }[] = [
  { id: "1211619", title: "Fearless (Karaoke Version)", why: "karaoke" },
  { id: "1211620", title: "Taylor Swift (Karaoke Version)", why: "karaoke" },
  { id: "1211618", title: "Speak Now (Karaoke Version)", why: "karaoke" },
  { id: "76330742", title: "The Taylor Swift Holiday Collection", why: "Christmas songs, no Era" },
  { id: "80126642", title: "reputation Stadium Tour Surprise Song Playlist", why: "a playlist of other Albums' songs" },
  { id: "374574167", title: "Anti-Hero (Remixes)", why: "one song's remixes" },
  { id: "510515281", title: "The Cruelest Summer", why: "one song's live version and remixes" },
  { id: "650714541", title: "THE TORTURED POETS DEPARTMENT | TS The Eras Tour Setlist", why: "a tour setlist" },
];

/** Whether an Album is a Taylor's Version re-recording. */
export const isTaylorsVersion = (album: CatalogueAlbum) => album.reRecords !== undefined;

/** "Fearless (Taylor's Version)": the Album's name, without its edition. */
export const albumName = (album: CatalogueAlbum) => (isTaylorsVersion(album) ? `${album.title} (Taylor's Version)` : album.title);

/** The year the Album was first released. */
export const albumYear = (album: CatalogueAlbum) => Number(album.released.slice(0, 4));

/** Every Deezer ID that stands for this Album: its own, its versions', its aliases. */
export const albumIds = (album: CatalogueAlbum) => [album.id, ...(album.versions ?? []).map(({ id }) => id), ...(album.aliases ?? [])];

/** The catalogue Album a Deezer ID stands for (its own, a version's, an alias), or none. */
export function findAlbum(id: string | undefined): CatalogueAlbum | undefined {
  return id ? CATALOGUE.find((album) => albumIds(album).includes(id)) : undefined;
}

/** The Album that stands for an Era: its Taylor's Version when there is one (the one we stream). */
export function eraAlbum(era: EraSlug): CatalogueAlbum {
  return CATALOGUE.findLast((album) => album.era === era)!;
}
