/* eslint-disable no-console -- command-line script: its output is the report */
// Compares Taylor Swift's albums and EPs on Deezer with the catalogue
// (lib/catalogue.ts) and lists the ones it does not know: a new Album, or a
// new version of one. Singles are left out. The weekly workflow
// (.github/workflows/releases.yml) runs it and opens an issue for them.
//
// Usage:
//   npm run releases:check                        prints the report
//   npm run releases:check -- --report <file>     also writes it as Markdown, if anything is new
import { writeFileSync } from "node:fs";

import { CATALOGUE, IGNORED_RELEASES, albumIds } from "../lib/catalogue";

/** Taylor Swift on Deezer. */
const ARTIST_ID = 12246;

type Release = { id: number; title: string; release_date: string; record_type: string; link: string };
type Page = { data: Release[]; next?: string; error?: { message: string } };

async function allReleases(): Promise<Release[]> {
	const releases: Release[] = [];
	let url: string | undefined = `https://api.deezer.com/artist/${ARTIST_ID}/albums?limit=100`;

	while (url) {
		const page = (await (await fetch(url)).json()) as Page;

		if (page.error) throw new Error(`Deezer: ${page.error.message}`);
		releases.push(...page.data);
		url = page.next;
	}

	return releases;
}

async function main() {
	const reportIndex = process.argv.indexOf("--report");
	const reportFile = reportIndex > 0 ? process.argv[reportIndex + 1] : undefined;
	const known = new Set([...CATALOGUE.flatMap(albumIds), ...IGNORED_RELEASES.map(({ id }) => id)]);
	const releases = await allReleases();
	const unknown = releases
		.filter(({ record_type, id }) => record_type !== "single" && !known.has(String(id)))
		.toSorted((a, b) => a.release_date.localeCompare(b.release_date));

	console.log(`${releases.length} releases on Deezer, ${unknown.length} not in the catalogue.`);
	if (!unknown.length) return;

	const lines = unknown.map(({ id, title, release_date, record_type, link }) => `- [${title}](${link}) (${record_type}, ${release_date}, Deezer ID \`${id}\`)`);

	console.log(lines.join("\n"));
	if (reportFile) {
		writeFileSync(
			reportFile,
			[
				"Deezer lists releases by Taylor Swift that the catalogue (`lib/catalogue.ts`) does not know:",
				"",
				...lines,
				"",
				"For each one, either add it to the catalogue (a new Album, with its Era in `lib/eras.ts`, or a new version of an Album in its `versions`), or add it to `IGNORED_RELEASES` with the reason it is left out (karaoke, a playlist, one song's remixes…).",
				"",
				"_Opened by the weekly [release check](../blob/dev/scripts/check-releases.ts); it updates this issue while it is open._",
			].join("\n"),
		);
	}
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
