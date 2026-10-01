import tours from "@/public/json/tours.json";
import { siteConfig } from "@/config/site";
import { formatReleaseDate } from "@/components/music/format";
import { type AlbumFacts, getAlbumFacts, tracklistFacts } from "@/lib/album-facts";
import { CATALOGUE, type CatalogueAlbum, albumName, albumYear } from "@/lib/catalogue";
import { absoluteUrl, albumPath } from "@/lib/metadata";

/*
  /llms.txt (https://llmstxt.org): the site in plain Markdown for AI
  assistants and answer engines. Answer first (what the site is), then its
  sections, the Albums by Era and the Tours, each with its canonical URL.
  Generated at build time from the site's own data (the catalogue, the Tours
  data, config/site.ts), so it says nothing the site does not.

  A route handler cannot load next/font faces, which lib/eras.ts and
  lib/tours.ts bring in with the Era looks, so the Eras are read from the
  catalogue (each Album names its Era; an Era is named after its first
  Album, as in lib/eras.ts) and the Tours from their data file.
*/
export const dynamic = "force-static";

type TourData = (typeof tours)[number];

/** The catalogue's Albums by Era, in Era order (the catalogue's own). */
const ALBUMS_BY_ERA = [...Map.groupBy(CATALOGUE, (album) => album.era).values()];

/** An Era's name: its first Album's title ("Fearless", "reputation"). */
const eraName = (era: string) => CATALOGUE.find((album) => album.era === era)?.title;

/** One Album: its page, release date, its tracklist's facts, what it re-records, the edition shown, its other Versions. */
function albumLine(album: CatalogueAlbum, tracklist: AlbumFacts | undefined): string {
  const original = album.reRecords ? CATALOGUE.find(({ id }) => id === album.reRecords) : undefined;
  const facts = [
    `released ${formatReleaseDate(album.released)}`,
    tracklist && tracklistFacts(tracklist),
    original && `Taylor Swift's re-recording of ${albumName(original)} (${albumYear(original)})`,
    album.edition && `edition shown: ${album.edition}`,
    album.versions?.length && `other Versions: ${album.versions.map((version) => `${version.name} (${formatReleaseDate(version.released)})`).join("; ")}`,
  ].filter(Boolean);

  return `- [${albumName(album)}](${absoluteUrl(albumPath(album))}): ${facts.join("; ")}.`;
}

/** One Tour: its page, years, shows, Era, legs and facts. */
function tourLine(tour: TourData): string {
  const era = tour.era ? `in the ${eraName(tour.era)} Era` : "spanning every Era";

  return `- [${tour.tour}](${absoluteUrl(`/tours/${tour.slug}`)}): ${tour.date.replace("-", "–")}, ${tour.shows} shows, ${era}; legs: ${tour.legs.join(", ")}. ${tour.facts.join(" ")}`;
}

export async function GET() {
  const tracklists = await getAlbumFacts();
  const albumsByEra = ALBUMS_BY_ERA.map(([first, ...others]) =>
    [`### ${first.title} Era (${albumYear(first)})`, "", ...[first, ...others].map((album) => albumLine(album, tracklists.get(album.id)))].join("\n"),
  );

  const text = `# ${siteConfig.name}

> ${siteConfig.name} (${absoluteUrl("/")}) is an unofficial Taylor Swift fan site, kept like a scrapbook: her ${CATALOGUE.length} Albums (every studio Album and every Taylor's Version) with their tracklists, her ${tours.length} Tours, and Swiftter, a small feed where fans post. It is not affiliated with Taylor Swift, her team or her labels.

- The site is organised by Era: one album cycle of Taylor Swift's career (Fearless, Red, 1989...), each with its own colours and typeface. There are ${ALBUMS_BY_ERA.length} Eras.
- An Album belongs to exactly one Era. A Taylor's Version (a re-recording of an earlier Album) is a separate Album in the same Era as the original.
- Each Album is shown in its most complete edition; its other Versions (other editions, live and acoustic albums, "Chapter" compilations) open on the same page.
- Covers, tracklists, running times, labels and 30-second previews come from Deezer's public API. Song counts, running times and labels below are those of the edition each page shows; every tracklist is in [llms-full.txt](${absoluteUrl("/llms-full.txt")}).

## Sections

- [Home](${absoluteUrl("/")}): the opening spread, with ways into Music, Tours and Swiftter, every Era pressed like a flower (each opens its Album on Music), and the Tour posters.
- [Music](${absoluteUrl("/music")}): every Album on a shelf, in Era order. Opening an Album shows its cover, tracklist with running times, label, 30-second previews and its other Versions; each Album and Version has its own address (\`/music?album=<Deezer album ID>\`).
- [Tours](${absoluteUrl("/tours")}): every Tour as a journal entry (ticket stub, poster, footage), each with its own page of facts.
- [Swiftter](${absoluteUrl("/swiftter")}): the fan feed. Anyone can read it; Members (fans who signed the guestbook) publish Posts.

## Albums by Era

${albumsByEra.join("\n\n")}

## Tours

${tours.map(tourLine).join("\n")}
`;

  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
