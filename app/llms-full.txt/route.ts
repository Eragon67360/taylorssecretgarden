import { siteConfig } from "@/config/site";
import { formatReleaseDate, formatTrackTime } from "@/components/music/format";
import { getAlbumFacts, tracklistFacts } from "@/lib/album-facts";
import { CATALOGUE, albumName, originalOf } from "@/lib/catalogue";
import { absoluteUrl, albumPath } from "@/lib/metadata";

/*
  /llms-full.txt: every Album's full tracklist, for AI assistants that want
  more than /llms.txt's summary. Each Album as its page shows it (the edition
  on the shelf, with running times), from the same cached Deezer data, built
  once at build time. An Album Deezer failed to answer is listed without its
  tracks rather than failing the file.
*/
export const dynamic = "force-static";

export async function GET() {
  const tracklists = await getAlbumFacts();
  const albums = CATALOGUE.map((album) => {
    const facts = tracklists.get(album.id);
    const original = originalOf(album);
    const about = [
      `Released ${formatReleaseDate(album.released)}`,
      original && `Taylor Swift's re-recording of ${albumName(original)}`,
      album.edition && `edition shown: ${album.edition}`,
      facts && tracklistFacts(facts),
    ].filter(Boolean);
    const tracks = facts?.tracks.map((track, index) => `${index + 1}. ${track.name} (${formatTrackTime(track.duration_ms)})`) ?? [];

    return [`## ${albumName(album)}`, "", `${absoluteUrl(albumPath(album))}`, "", `${about.join("; ")}.`, "", ...tracks].join("\n");
  });

  const text = `# ${siteConfig.name}: every tracklist

> The tracklists of Taylor Swift's ${CATALOGUE.length} Albums (every studio Album and every Taylor's Version), as ${siteConfig.name} (${absoluteUrl("/")}), an unofficial fan site, shows them: each Album in its most complete edition, with running times, from Deezer's public API. The summary is in ${absoluteUrl("/llms.txt")}.

${albums.join("\n\n")}
`;

  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
