// Captures the real Taylor's Secret Garden site for the portfolio hover video.
// Run: HOVER_KIT_DIR=<portfolio>/resources/hover-videos/kit HOVER_KIT_DEPS=<deps>/package.json node capture.mjs
// Scrolls are captured one screenshot per video frame (30fps) along the same eased curve the
// composition plays, so scroll masks and fixed elements stay exactly as the site renders them.
import { writeFileSync } from "node:fs";
const { openBrowser, warmUp, shoot, box } = await import(`${process.env.HOVER_KIT_DIR}/capture.mjs`);

const dir = new URL("./captures", import.meta.url).pathname;
const SITE = "https://taylorssecretgarden.vercel.app";
const FPS = 30;
const { browser, page } = await openBrowser();
const layout = { seq: {} };

const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** One JPEG per frame while `scroll(y)` moves from `from` to `to` over `seconds`. */
async function scrollSeq(name, from, to, seconds, scroll) {
  const frames = Math.round(seconds * FPS);
  for (let f = 0; f <= frames; f++) {
    await scroll(Math.round(from + (to - from) * inOut(f / frames)));
    await page.waitForTimeout(90);
    await page.screenshot({ path: `${dir}/${name}-${String(f).padStart(2, "0")}.jpg`, type: "jpeg", quality: 88, scale: "css" });
  }
  layout.seq[name] = frames + 1;
}
const settle = async (text) => {
  await page.waitForFunction((s) => document.body.innerText.includes(s), text, { timeout: 20000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
};

// Home: the card view. Its title is the site's wordmark, reused on the transitions.
await page.goto(SITE, { waitUntil: "networkidle" });
await warmUp(page);
await page.waitForTimeout(1500);
await shoot(page, dir, "home", { full: false });
layout.title = await box(page, "h1");
layout.accent = await page.evaluate(() => {
  const red = [...document.querySelectorAll("span, p")].find((e) => e.textContent.trim() === "EW");
  return red && getComputedStyle(red).color;
});
layout.musicLink = await box(page, 'a[href="/music"]');

// Music: open "1989 (Taylor's Version)", scroll the album list, open "Red (Taylor's Version)".
await page.goto(`${SITE}/music`, { waitUntil: "networkidle" });
await settle("Picture To Burn");
await shoot(page, dir, "music-0", { full: false });
const album = (title) => `button:has(img[alt="Cover Album ${title}"])`;
layout.album1989 = await box(page, album("1989 (Taylor's Version)"));
await page.click(album("1989 (Taylor's Version)"));
await settle("Welcome To New York");
await page.mouse.move(225, 400);
await page.waitForTimeout(600);
await shoot(page, dir, "music-1989", { full: false });
const list = await page.locator(`div.overflow-scroll:has(${album("Midnights")})`).first().elementHandle();
await scrollSeq("albums", 0, 700, 0.8, (y) => list.evaluate((el, top) => (el.scrollTop = top), y));
layout.albumRed = await box(page, album("Red (Taylor's Version)"));
await page.click(album("Red (Taylor's Version)"));
await settle("State Of Grace");
await page.mouse.move(225, 400);
await page.waitForTimeout(600);
await shoot(page, dir, "music-red", { full: false });

// Tours: the landing (background video playing), then open The Eras Tour.
await page.goto(`${SITE}/tours`, { waitUntil: "load" });
await page.waitForTimeout(6000);
await shoot(page, dir, "tours", { full: false });
const eras = 'a[href="/tours/the-eras-tour"]';
// The bottom navigation's gradient covers the poster's lower half: the cursor clicks its upper part.
layout.eras = await box(page, `${eras} img`);

await page.goto(`${SITE}/tours/the-eras-tour`, { waitUntil: "load" });
await page.waitForTimeout(5000);
await warmUp(page);
await page.waitForTimeout(1000);
await scrollSeq("eras", 0, 420, 0.8, (y) => page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y));

// A script, not JSON: compositions are opened from file://, where fetch() is blocked.
writeFileSync(`${dir}/layout.js`, `window.LAYOUT = ${JSON.stringify(layout, null, 2)};\n`);
console.log(layout);
await browser.close();
