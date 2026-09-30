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
