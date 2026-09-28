// Prints the Lighthouse CI scores as a Markdown table: the representative
// (median) run of each page, plus every run's Performance score. The CI job
// appends it to the run summary. Usage: node scripts/lighthouse-summary.mjs
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(".lighthouseci/reports/manifest.json", "utf8"));
const print = (line) => process.stdout.write(`${line}\n`);
const pct = (score) => Math.round(score * 100);
const rows = new Map();

for (const run of manifest) {
  const path = new URL(run.url).pathname;
  const row = rows.get(path) ?? { runs: [] };

  row.runs.push(pct(run.summary.performance));
  if (run.isRepresentativeRun) row.median = run.summary;
  rows.set(path, row);
}

print("| Page | Performance (median) | Accessibility (median) | Performance, every run |");
print("| --- | --- | --- | --- |");
for (const [path, { median, runs }] of rows) {
  print(`| \`${path}\` | ${pct(median.performance)} | ${pct(median.accessibility)} | ${runs.join(", ")} |`);
}
