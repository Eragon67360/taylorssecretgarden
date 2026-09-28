// Captures Taylor's Secret Garden (the Secret Garden design) for the portfolio hover video.
// Run against a local production build, or any deployment, signed out:
//   npm run build && npx next start -p 3190
//   HOVER_KIT_DIR=<portfolio>/resources/hover-videos/kit HOVER_KIT_DEPS=<deps>/package.json node capture.mjs
// SITE overrides the origin (default http://localhost:3190, e.g. SITE=https://taylorssecretgarden.vercel.app).
// Scrolls are captured one screenshot per video frame (30fps) along the same eased curve the
// composition plays, so on-scroll content and the paper textures stay exactly as the site renders them.
import { readdirSync, rmSync, writeFileSync } from "node:fs";
const { openBrowser, warmUp, shoot, box } = await import(`${process.env.HOVER_KIT_DIR}/capture.mjs`);

const dir = new URL("./captures", import.meta.url).pathname;
const SITE = process.env.SITE ?? "http://localhost:3190";
const FPS = 30;
const { browser, page } = await openBrowser();
const layout = { seq: {} };

// Start from an empty folder: sequences change length between runs.
for (const file of readdirSync(dir)) rmSync(`${dir}/${file}`);

const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const scrollTo = (y) => page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
/** Moves the cursor out of the way, so no hover state shows on a capture. */
const rest = async () => {
  await page.mouse.move(1270, 790);
  await page.waitForTimeout(500);
};

/** One JPEG per frame while the page scrolls from `from` to `to` over `seconds`. */
async function scrollSeq(name, from, to, seconds) {
  const frames = Math.round(seconds * FPS);
  for (let f = 0; f <= frames; f++) {
    await scrollTo(Math.round(from + (to - from) * inOut(f / frames)));
    await page.waitForTimeout(90);
    await page.screenshot({ path: `${dir}/${name}-${String(f).padStart(2, "0")}.jpg`, type: "jpeg", quality: 82, scale: "css" });
  }
  layout.seq[name] = frames + 1;
}
/** Document y of an element's top edge. */
const top = (selector) => page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);

// Home: the hero (the card screenshot, first and last frame), then a scroll down to the Eras herbarium.
await page.goto(SITE, { waitUntil: "networkidle" });
await warmUp(page);
await rest();
await page.waitForTimeout(1000);
await shoot(page, dir, "home", { full: false });
layout.logo = await box(page, '#site-header a[href="/"]');
layout.accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
layout.paper = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--paper").trim());

// The herbarium's folklore card sits on its second row; the scroll ends with both rows in view.
const folklore = 'main a[href^="/music?album="]:has-text("folklore")';
const herbariumEnd = Math.round((await top(folklore)) - 230);
await scrollSeq("home", 0, herbariumEnd, 1.5);
layout.folklore = await box(page, folklore);
await page.hover(folklore);
await page.waitForTimeout(700);
await shoot(page, dir, "home-hover", { full: false });

// Music: the herbarium card opens folklore; then the Showgirl polaroid re-themes the page.
await page.click(folklore);
await page.waitForURL(/\/music\?album=/);
await page.getByRole("heading", { level: 2, name: "folklore" }).waitFor();
await page.waitForLoadState("networkidle");
await scrollTo(0);
await rest();
await page.waitForTimeout(1200);
await shoot(page, dir, "music-folklore", { full: false });
const showgirl = 'ul[aria-label="Albums"] a[aria-label="The Life of a Showgirl"]';
layout.showgirl = await box(page, showgirl);
await page.click(showgirl);
await page.getByRole("heading", { level: 2, name: "The Life of a Showgirl" }).waitFor();
await page.getByRole("button", { name: /^Play preview of / }).first().waitFor();
await page.waitForLoadState("networkidle");
await rest();
await page.waitForTimeout(1500);
await shoot(page, dir, "music-showgirl", { full: false });

// Tours: the journal's opening, then a scroll into The Eras Tour's page. Tours sections render
// only near the viewport (content-visibility: auto), so they are captured by scrolling to them.
await page.goto(`${SITE}/tours`, { waitUntil: "networkidle" });
await rest();
await page.waitForTimeout(1500);
const erasLink = 'main a[href="/tours/the-eras-tour"]:has-text("More on")';
const toursEnd = Math.round((await top(erasLink)) - 420);
await scrollSeq("tours", 0, toursEnd, 0.7);
layout.erasLink = await box(page, erasLink);

// The Eras Tour page: its ticket and poster, then a scroll down the page.
await page.goto(`${SITE}/tours/the-eras-tour`, { waitUntil: "networkidle" });
await warmUp(page);
await rest();
await page.waitForTimeout(1000);
await scrollSeq("eras", 0, 460, 0.8);

// A script, not JSON: compositions are opened from file://, where fetch() is blocked.
writeFileSync(`${dir}/layout.js`, `window.LAYOUT = ${JSON.stringify(layout, null, 2)};\n`);
console.log(layout);
await browser.close();
