import { MAX_NOTE_CHARACTERS } from "@/lib/swiftter";

/*
  Words the Swiftter controls say about a note, for screen readers mostly.
  Plain functions, unit-tested (tests/unit/swiftter-words.test.ts).
*/

/** Characters left at which the composer's counter is read out: its words change only when one is crossed. */
const THRESHOLDS = [200, 100, 50, 20, 10, 0];

/** What a screen reader hears about a note's length: nothing far from the limit, then one line per threshold. */
export function limitMessage(characters: number): string {
  if (characters > MAX_NOTE_CHARACTERS) return `Too long: a note holds ${MAX_NOTE_CHARACTERS} characters at most.`;
  const left = MAX_NOTE_CHARACTERS - characters;
  const threshold = THRESHOLDS.findLast((value) => left <= value);

  if (threshold === undefined) return "";

  return threshold === 0 ? "The note is full." : `${threshold} characters left at most.`;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

/**
 * A note's first words, as plain text, to tell its controls apart: "tear up
 * your note “ok but the bridge…”" rather than one "tear up" per note. The
 * HTML is the sanitised markup the API serves, so tags and a few entities are
 * all there is to take out.
 */
export function noteExcerpt(html: string, length = 40): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name: string) => ENTITIES[name])
    .replace(/\s+/g, " ")
    .trim();

  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}
