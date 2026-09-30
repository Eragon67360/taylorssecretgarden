/** A schema.org thing: its type and properties (https://schema.org). */
export type StructuredData = { "@context": "https://schema.org"; "@type": string } & Record<string, unknown>;

/**
 * Taylor Swift, the artist every Album and Tour on the site is by: a
 * MusicGroup (schema.org's type for a solo musician too), tied to her
 * Wikipedia and Wikidata entries and her official site, so search engines and
 * assistants know which Taylor Swift this is.
 */
export const TAYLOR_SWIFT = {
  "@type": "MusicGroup",
  name: "Taylor Swift",
  sameAs: ["https://en.wikipedia.org/wiki/Taylor_Swift", "https://www.wikidata.org/wiki/Q26876", "https://www.taylorswift.com"],
} as const;

/** A duration in whole seconds as ISO 8601: 234 → "PT3M54S". */
export function isoDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${seconds % 60 || !(hours || minutes) ? `${seconds % 60}S` : ""}`;
}

/**
 * Structured data that search engines and AI assistants read (JSON-LD),
 * rendered on the server. Every `<` is escaped (<), so no value, however
 * it is written, can close the script tag early.
 */
export function JsonLd({ data }: { data: StructuredData }) {
  return <script dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} type="application/ld+json" />;
}
