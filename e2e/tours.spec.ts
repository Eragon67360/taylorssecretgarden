import type { Credit } from "../lib/credits";

import tours from "../public/json/tours.json";

import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow, expectReducedMotion } from "./checks";
import { expect, test } from "./fixtures";

const ERA_NAMES: Record<string, string> = {
  fearless: "Fearless",
  "speak-now": "Speak Now",
  red: "Red",
  "1989": "1989",
  reputation: "reputation",
};

/** The Era line a Tour's ticket stub prints ("Fearless Era", or every Era for the Eras Tour). */
const eraLabel = (era: string | null) => (era ? `${ERA_NAMES[era]} Era` : "Every Era");
/** "2013-2014" as printed: "2013–2014". */
const years = (date: string) => date.replace("-", "–");

/** A Tour's recorded credits, in page order: poster, footage, gallery. Only traced sources are recorded (lib/credits.ts). */
const creditsOf = (tour: (typeof tours)[number]): Credit[] =>
  [tour.imageCredit, tour.videoCredit, ...(tour.gallery ?? []).map((photo) => photo.credit)].filter((credit) => credit !== undefined);

test.describe("Tours journal", () => {
  test("has one journal section per Tour, with its years and Era, linking to its Tour page", async ({ page }) => {
    await page.goto("/tours");
    await expect(page.getByRole("heading", { name: "Tours", level: 1 })).toBeVisible();

    const sections = page.getByRole("main").getByRole("region");

    await expect(sections).toHaveCount(tours.length);
    for (const [index, { tour, slug, date, era }] of tours.entries()) {
      const section = sections.nth(index);

      await expect(section.getByRole("heading", { name: tour, exact: true })).toBeVisible();
      await expect(section).toContainText(years(date));
      await expect(section).toContainText(eraLabel(era));
      await expect(section.getByRole("link", { name: `More on ${tour}`, exact: true })).toHaveAttribute("href", `/tours/${slug}`);
    }
  });

  test("shows every Tour's poster in a polaroid", async ({ page }) => {
    await page.goto("/tours");

    for (const { tour } of tours) {
      const poster = page.getByRole("img", { name: `${tour} poster`, exact: true });

      await poster.scrollIntoViewIfNeeded();
      await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    }
  });

  test("never shows one Tour's video on another Tour", async () => {
    const videos = tours.flatMap(({ videoUrl }) => (videoUrl ? [videoUrl] : []));

    expect(new Set(videos).size, "each video belongs to one Tour").toBe(videos.length);
  });

  test("a Tour's video plays muted once in view, and stops when scrolled away", async ({ page }) => {
    await page.goto("/tours");

    const withVideo = tours.filter(({ videoUrl }) => videoUrl);
    const first = page.getByRole("region", { name: withVideo[0].tour }).locator("video");
    const last = page.getByRole("region", { name: withVideo.at(-1)!.tour }).locator("video");

    await first.scrollIntoViewIfNeeded();
    await expect.poll(() => first.evaluate((video: HTMLVideoElement) => video.muted && !video.paused)).toBe(true);

    await last.scrollIntoViewIfNeeded();
    await expect.poll(() => last.evaluate((video: HTMLVideoElement) => video.muted && !video.paused)).toBe(true);
    await expect.poll(() => first.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  });

  test("footage far down the journal fetches no still frame until it is scrolled near", async ({ page }) => {
    await page.goto("/tours", { waitUntil: "load" });

    const last = page.getByRole("region", { name: tours.filter(({ videoUrl }) => videoUrl).at(-1)!.tour }).locator("video");

    expect(await last.getAttribute("poster")).toBeNull();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toHaveAttribute("poster", /\.jpg$/);
  });

  test("a playing video can be paused", async ({ page }) => {
    await page.goto("/tours");

    const section = page.getByRole("region", { name: tours.find(({ videoUrl }) => videoUrl)!.tour });
    const video = section.locator("video");

    await video.scrollIntoViewIfNeeded();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused)).toBe(true);
    await section.getByRole("button", { name: /^Pause/ }).click();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    await expect(section.getByRole("button", { name: /^Play/ })).toBeVisible();
  });

  test("passes axe (WCAG 2.2 AA)", async ({ page }) => {
    await page.goto("/tours");
    await expectNoAxeViolations(page);
  });

  test("fits a 390px phone", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/tours");
    await expectNoHorizontalOverflow(page);
  });

  test("is still under reduced motion, videos included", async ({ page }) => {
    await page.goto("/tours");
    await expectReducedMotion(page);

    // Scrolling a video into view must not start it either.
    const video = page.locator("video").first();

    await video.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  });
});

for (const tour of tours) {
  test.describe(`Tour page /tours/${tour.slug}`, () => {
    const path = `/tours/${tour.slug}`;

    test("shows its own facts, and no other Tour's", async ({ page }) => {
      await page.goto(path);

      await expect(page.getByRole("heading", { name: tour.tour, level: 1 })).toBeVisible();
      const main = page.getByRole("main");

      await expect(main).toContainText(years(tour.date));
      await expect(main).toContainText(eraLabel(tour.era));
      await expect(main.getByText(`${tour.shows} shows`, { exact: true })).toBeVisible();
      for (const leg of tour.legs) await expect(main.getByRole("listitem").filter({ hasText: leg }).first()).toBeVisible();
      for (const fact of tour.facts) await expect(main.getByText(fact, { exact: true })).toBeVisible();

      for (const other of tours.filter(({ slug }) => slug !== tour.slug)) {
        for (const fact of other.facts) await expect(main.getByText(fact, { exact: true })).toHaveCount(0);
      }
    });

    test("shows its poster", async ({ page }) => {
      await page.goto(path);
      const poster = page.getByRole("img", { name: `${tour.tour} poster`, exact: true });

      await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    });

    if (tour.gallery) {
      test("keeps its photo gallery", async ({ page }) => {
        await page.goto(path);
        const gallery = page.getByRole("region", { name: "Gallery" });

        for (const { alt } of tour.gallery!) {
          const photo = gallery.getByRole("img", { name: alt, exact: true });

          await photo.scrollIntoViewIfNeeded();
          await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
        }
      });
    }

    const credited = creditsOf(tour);

    if (credited.length > 0) {
      test("credits its poster, footage and photos under each", async ({ page }) => {
        await page.goto(path);
        // The small print on the polaroids, in page order: poster, footage, gallery.
        const credits = page.getByRole("main").locator("figcaption small");

        await expect(credits).toHaveText(credited.map(({ author }) => `© ${author}`));
        for (const { author, url } of credited) {
          if (url) await expect(credits.getByRole("link", { name: author, exact: true })).toHaveAttribute("href", url);
        }
      });
    }

    test("links back to the Tours journal", async ({ page }) => {
      await page.goto(path);
      await page.getByRole("link", { name: /back to the tours/i }).click();
      await expect(page).toHaveURL(/\/tours$/);
    });

    test("passes axe (WCAG 2.2 AA)", async ({ page }) => {
      await page.goto(path);
      await expectNoAxeViolations(page);
    });

    test("fits a 390px phone", async ({ page }) => {
      await page.setViewportSize(PHONE);
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
    });

    test("is still under reduced motion", async ({ page }) => {
      await page.goto(path);
      await expectReducedMotion(page);
    });
  });
}

test.describe("Credits page", () => {
  test("lists every recorded credit, by Tour, and Deezer", async ({ page }) => {
    await page.goto("/credits");
    const main = page.getByRole("main");

    await expect(page.getByRole("heading", { name: "Credits", level: 1 })).toBeVisible();
    for (const tour of tours) {
      const credits = creditsOf(tour);

      if (credits.length === 0) continue;
      const section = main.getByRole("region", { name: tour.tour, exact: true });

      for (const { work, author, licence } of credits) {
        await expect(section.getByRole("listitem").filter({ hasText: work }).filter({ hasText: author }).filter({ hasText: licence })).toHaveCount(1);
      }
    }
    await expect(main.getByRole("link", { name: "Deezer" })).toHaveAttribute("href", /^https:\/\/www\.deezer\.com/);
  });

  test("passes axe (WCAG 2.2 AA)", async ({ page }) => {
    await page.goto("/credits");
    await expectNoAxeViolations(page);
  });

  test("fits a 390px phone", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/credits");
    await expectNoHorizontalOverflow(page);
  });
});

test("an unknown Tour answers 404", async ({ request }) => {
  const response = await request.get("/tours/the-imaginary-tour");

  expect(response.status()).toBe(404);
});
