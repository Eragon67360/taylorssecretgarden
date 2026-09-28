import tours from "@/public/json/tours.json";

/**
 * A Tour poster from Cloudinary, cropped to a 2:3 poster and resized there
 * (Cloudinary picks the format and quality), so it needs no next/image pass.
 */
export function tourPoster(imageUrl: string, width: number) {
  return imageUrl.replace("/upload/f_auto,q_auto/", `/upload/f_auto,q_auto,c_fill,g_auto,ar_2:3,w_${width}/`);
}

/** What a fan pencilled under each poster on the bedroom wall, by Tour slug. */
const WALL_NOTES: Record<string, string> = {
  "the-eras-tour": "the one that broke Ticketmaster (and us)",
  "reputation-tour": "a 63-foot snake. normal Tuesday",
  "1989-tour": "surprise guests every night, somehow",
  "the-red-tour": "22 on the B-stage, hat included",
  "speak-now-world-tour": "the ballgown era. there was a tree.",
  "fearless-tour": "the first headline tour. sparkly guitar mandatory",
};

/** The Tours pinned on the home page's Tour wall, newest first (the order of the tours data). */
export const WALL_TOURS = tours.map(({ tour, date, imageUrl, slug }) => ({
  name: tour,
  years: date.replace("-", "–"),
  poster: imageUrl,
  slug,
  note: WALL_NOTES[slug],
}));
