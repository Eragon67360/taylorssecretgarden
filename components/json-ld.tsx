/** A schema.org thing: its type and properties (https://schema.org). */
export type StructuredData = { "@context": "https://schema.org"; "@type": string } & Record<string, unknown>;

/** Taylor Swift, the artist every Album and Tour on the site is by. */
export const TAYLOR_SWIFT = { "@type": "Person", name: "Taylor Swift" } as const;

/**
 * Structured data that search engines and AI assistants read (JSON-LD),
 * rendered on the server. Every `<` is escaped (<), so no value, however
 * it is written, can close the script tag early.
 */
export function JsonLd({ data }: { data: StructuredData }) {
  return <script dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} type="application/ld+json" />;
}
