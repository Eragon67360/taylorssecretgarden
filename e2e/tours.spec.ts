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

type TourData = (typeof tours)[number];

/** The credits printed under a Tour page's polaroids, in page order: poster, the trailer's stand-in photo or the stage photo, gallery. */
const photoCreditsOf = (tour: TourData): Credit[] =>
  [
    tour.imageCredit,
    tour.trailer ? tour.trailer.still.credit : undefined,
    tour.stage ? tour.stage.credit : undefined,
    ...(tour.gallery ? tour.gallery.map((photo) => photo.credit) : []),
  ].filter((credit) => credit !== undefined);

/** Everything the Credits page lists for a Tour: its photos and its trailer. */
const creditsOf = (tour: TourData): Credit[] => [...photoCreditsOf(tour), ...(tour.trailer ? [tour.trailer.credit] : [])];

/** The small print under a photo: its author, and its licence when it is an open one. */
const smallPrint = ({ author, licence, licenceUrl }: Credit) => (licenceUrl ? `© ${author} · ${licence}` : `© ${author}`);

const ERAS_TOUR = tours.find((tour) => tour.trailer)!;
/** Anything from YouTube or Google's video hosts. */
const YOUTUBE = /youtube(-nocookie)?\.com|ytimg\.com|googlevideo\.com/;

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

    for (const { imageAlt } of tours) {
      const poster = page.getByRole("img", { name: imageAlt, exact: true });

      await poster.scrollIntoViewIfNeeded();
      await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    }
  });

  test("never shows one Tour's photo on another Tour", async () => {
    const pictures = tours.flatMap((tour) => [
      tour.imageUrl,
      ...(tour.trailer ? [tour.trailer.still.src] : []),
      ...(tour.stage ? [tour.stage.src] : []),
      ...(tour.gallery ? tour.gallery.map(({ src }) => src) : []),
    ]);

    expect(new Set(pictures).size, "each picture belongs to one Tour").toBe(pictures.length);
  });

  test("shows the trailer's stand-in, and loads nothing from YouTube", async ({ page }) => {
    const youtube: string[] = [];

    page.on("request", (request) => {
      if (YOUTUBE.test(request.url())) youtube.push(request.url());
    });
    await page.goto("/tours", { waitUntil: "load" });
    const play = page.getByRole("region", { name: ERAS_TOUR.tour }).getByRole("button", { name: `Play ${ERAS_TOUR.trailer!.name} (YouTube)` });

    await play.scrollIntoViewIfNeeded();
    await expect(play).toBeVisible();
    // Its stand-in photo has loaded: anything the polaroid fetches has been asked for by now.
    const still = play.locator("img");

    await expect.poll(() => still.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    expect(youtube, "no request to YouTube before play is pressed").toEqual([]);
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

  test("is still under reduced motion", async ({ page }) => {
    await page.goto("/tours");
    await expectReducedMotion(page);
  });
});

test.describe("The Eras Tour trailer", () => {
  const path = `/tours/${ERAS_TOUR.slug}`;
  const trailer = ERAS_TOUR.trailer!;

  test("plays from YouTube's no-cookie host only once play is pressed", async ({ page }) => {
    const youtube: string[] = [];

    page.on("request", (request) => {
      if (YOUTUBE.test(request.url())) youtube.push(request.url());
    });
    // The player itself is not under test: an empty page stands in for it.
    await page.route(/youtube-nocookie\.com/, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>player</title>" }));
    await page.goto(path, { waitUntil: "networkidle" });

    const play = page.getByRole("button", { name: `Play ${trailer.name} (YouTube)`, exact: true });

    await expect(play).toBeVisible();
    await expect(page.getByText("Plays from YouTube", { exact: true })).toBeVisible();
    expect(youtube, "no request to YouTube before play is pressed").toEqual([]);
    await expect(page.locator("iframe")).toHaveCount(0);

    await play.click();
    const frame = page.locator(`iframe[title="${trailer.title}"]`);

    await expect(frame).toHaveAttribute("src", new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${trailer.youtubeId}\\?`));
    await expect(play).toHaveCount(0);
    await expect.poll(() => youtube.some((url) => url.startsWith("https://www.youtube-nocookie.com/embed/"))).toBe(true);
  });

  test("can be started from the keyboard", async ({ page }) => {
    await page.route(/youtube-nocookie\.com/, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>player</title>" }));
    await page.goto(path);

    const play = page.getByRole("button", { name: `Play ${trailer.name} (YouTube)`, exact: true });

    await play.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(`iframe[title="${trailer.title}"]`)).toBeFocused();
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
      const poster = page.getByRole("img", { name: tour.imageAlt, exact: true });

      await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    });

    if (tour.stage) {
      test("shows a photo from its stage", async ({ page }) => {
        await page.goto(path);
        const photo = page.getByRole("img", { name: tour.stage!.alt, exact: true });

        await photo.scrollIntoViewIfNeeded();
        await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      });
    }

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

    test("credits every photo under it, with its licence", async ({ page }) => {
      await page.goto(path);
      const credited = photoCreditsOf(tour);
      // The small print on the polaroids, in page order: poster, trailer or stage photo, gallery.
      const credits = page.getByRole("main").locator("figcaption small");

      await expect(credits).toHaveText(credited.map(smallPrint));
      for (const [index, { author, url, licence, licenceUrl }] of credited.entries()) {
        const credit = credits.nth(index);

        if (url) await expect(credit.getByRole("link", { name: author, exact: true })).toHaveAttribute("href", url);
        if (licenceUrl) await expect(credit.getByRole("link", { name: licence, exact: true })).toHaveAttribute("href", licenceUrl);
      }
    });

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
  test("lists every credit, with its licence and changes, on Home and by Tour, and Deezer", async ({ page }) => {
    await page.goto("/credits");
    const main = page.getByRole("main");

    await expect(page.getByRole("heading", { name: "Credits", level: 1 })).toBeVisible();
    await expect(main.getByRole("region", { name: "Home", exact: true }).getByRole("listitem")).toHaveCount(1);
    for (const tour of tours) {
      const section = main.getByRole("region", { name: tour.tour, exact: true });

      for (const { work, author, licence, licenceUrl, changes } of creditsOf(tour)) {
        const item = section.getByRole("listitem").filter({ hasText: work }).filter({ hasText: author }).filter({ hasText: licence });

        await expect(item).toHaveCount(1);
        if (licenceUrl) await expect(item.getByRole("link", { name: licence, exact: true })).toHaveAttribute("href", licenceUrl);
        if (changes) await expect(item).toContainText(changes);
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
