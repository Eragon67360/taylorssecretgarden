/* eslint-disable no-console -- command-line script: its output is the report */
// Draws the wordmark the account emails show (lib/emails/layout.ts) into
// public/email/wordmark.png: the site header's garden mark and name in the
// journal's pen (Caveat), on a paper label, at twice its size in the email.
// Emails cannot load the site's fonts or inline SVG reliably, so the wordmark
// travels as a PNG. The label keeps the ink readable when a mail app turns
// the email dark (the image itself is never inverted).
//
// Usage (from the repository root, after changing the wordmark):
//   npx tsx --conditions=react-server scripts/build-email-wordmark.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

import { siteConfig } from "../config/site";
import { WORDMARK } from "../lib/emails/layout";

const { paper, ink, line, accent, petalCentre } = { ...siteConfig.colors, line: "#e2d3bb" };
const caveat = readFileSync(join(process.cwd(), "assets/fonts/caveat-700.woff2")).toString("base64");
const petals = Array.from(
  { length: 8 },
  (_, index) => `<ellipse cx="20" cy="10" fill="${accent}" opacity=".8" rx="4.5" ry="9" transform="rotate(${index * 45} 20 20)"/>`,
).join("");

const html = `<!doctype html>
<style>
  @font-face { font-family: Caveat; src: url(data:font/woff2;base64,${caveat}) format("woff2"); font-weight: 700; }
  html, body { margin: 0; background: transparent; }
  .label {
    box-sizing: border-box; width: ${WORDMARK.width}px; height: ${WORDMARK.height}px;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    background: ${paper}; border: 1px solid ${line}; border-radius: 10px;
    color: ${ink}; font: 700 29px/1 Caveat, cursive;
  }
  svg { width: 32px; height: 32px; flex: none; }
</style>
<div class="label"><svg viewBox="0 0 40 40">${petals}<circle cx="20" cy="20" fill="${petalCentre}" r="5"/></svg><span>Taylor's Secret Garden</span></div>`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: WORDMARK.width, height: WORDMARK.height } });

  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const out = join(process.cwd(), "public", WORDMARK.path);

  await page.locator(".label").screenshot({ path: out, omitBackground: true });
  await browser.close();
  console.log(`Wrote ${out} (${WORDMARK.width * 2}x${WORDMARK.height * 2})`);
}

main();
