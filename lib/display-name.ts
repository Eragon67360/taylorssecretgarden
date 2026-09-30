/** The longest name a Member writes under, in graphemes (what a reader counts as characters): the sign-up form's limit. */
export const MAX_NAME_LENGTH = 80;

/**
 * The name a Member writes under: their own, else their email's local part,
 * cut to MAX_NAME_LENGTH graphemes. The sign-up form limits names in the
 * browser only, and Google names arrive as Google has them, so the cut is
 * made here too. Shared by the composer (browser) and the stored Member
 * (service/swiftter.ts).
 */
export function displayNameOf(person: { name?: string | null; email: string }): string {
  const name = person.name?.trim() || person.email.split("@")[0] || "Swiftie";

  return truncateGraphemes(name, MAX_NAME_LENGTH).trim();
}

/** The text cut to at most `max` graphemes, never splitting an emoji or an accented letter. */
export function truncateGraphemes(text: string, max: number): string {
  // Cheap exit: fewer code units than the limit means fewer graphemes too.
  if (text.length <= max) return text;

  let kept = "";
  let count = 0;

  for (const { segment } of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)) {
    if (count === max) break;
    kept += segment;
    count++;
  }

  return kept;
}
