import data from "@/public/json/tours.json";

import { type Credit } from "./credits";
import { ERA_LOOKS, type EraPalette, type EraSlug, type Flower, isEraSlug } from "./eras";

/*
  Every Tour (see CONTEXT.md), from public/json/tours.json, newest first. A
  Tour is tied to one Era and wears its look, except the Eras Tour, which
  spans every Era and has a look of its own (below).
*/

export type GalleryPhoto = { src: string; alt: string; caption: string; size: [number, number]; credit?: Credit };

export type Tour = {
  /** The Tour's name. */
  tour: string;
  slug: string;
  /** Years, "2013-2014" (see `tourYears` for print). */
  date: string;
  /** Its Era; null for the Eras Tour. */
  era: EraSlug | null;
  shows: number;
  /** Where its legs went, by continent. */
  legs: string[];
  /** Two or three well-established facts. */
  facts: string[];
  /** Handwritten fan note. */
  note: string;
  /** Poster: a photo of the Tour (public/img/tours), a 2:3 print, and its intrinsic size. */
  imageUrl: string;
  posterSize: [number, number];
  /** What the poster's photo shows. */
  imageAlt: string;
  /** The poster's source (lib/credits.ts). */
  imageCredit: Credit;
  /** The Tour's official trailer, embedded from YouTube on a click (components/tours/tour-trailer.tsx). */
  trailer?: Trailer;
  /** A photo from the Tour's stage beside the facts, for a Tour without a trailer. */
  stage?: GalleryPhoto;
  /** Photos from the Tour (public/img/tours). */
  gallery?: GalleryPhoto[];
};

/** An official trailer on YouTube, and the photo that stands in for it until the visitor plays it. */
export type Trailer = {
  youtubeId: string;
  /** What the play button calls it ("the Eras Tour film trailer"). */
  name: string;
  /** The video's title, for the embed's frame. */
  title: string;
  credit: Credit;
  /** Shown, with a play button, before anything loads from YouTube; never YouTube's own thumbnail. */
  still: GalleryPhoto;
};

export const TOURS: Tour[] = data.map((tour) => {
  if (tour.era !== null && !isEraSlug(tour.era)) throw new Error(`Tour ${tour.slug}: unknown Era "${tour.era}"`);

  return tour as Tour;
});

export function getTour(slug: string): Tour | undefined {
  return TOURS.find((tour) => tour.slug === slug);
}

/** "2013-2014" → "2013–2014". */
export function tourYears(tour: Pick<Tour, "date">) {
  return tour.date.replace("-", "–");
}

/** What the ticket stub prints for the Tour's Era. */
export function tourEraLabel(tour: Pick<Tour, "era">) {
  return tour.era ? `${ERA_LOOKS[tour.era].name} Era` : "Every Era";
}

/** A Tour's look: its Era's, or the Eras Tour's own. */
export type TourLook = EraPalette & { flower: Flower; dark?: boolean; plaid?: boolean };

/**
 * The Eras Tour's own look: a sequinned lilac night, friendship-bracelet
 * tape, the journal's serif as its display face. `ink` and `soft` pass AA on
 * `paper` and `card`.
 */
export const ERAS_TOUR_LOOK: TourLook = {
  paper: "#EFE6F3",
  card: "#FCF8FE",
  ink: "#2A1433",
  soft: "#5B3F66",
  accent: "#A2367F",
  onAccent: "#FFFFFF",
  line: "#DCC9E3",
  tape: "rgba(242, 181, 200, 0.6)",
  flower: "daisy",
  font: "var(--font-fraunces-italic), Georgia, serif",
  fontWeight: 600,
  fontItalic: true,
};

export function tourLook(tour: Pick<Tour, "era">): TourLook {
  return tour.era ? ERA_LOOKS[tour.era] : ERAS_TOUR_LOOK;
}
