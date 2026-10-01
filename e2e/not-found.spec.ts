import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow, expectReducedMotion } from "./checks";
import { expect, test } from "./fixtures";

// The journal's own 404 pages: an address the site does not have, and a
// Swiftter thread that is not public.
test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of 404/] });

test.describe("Page not found", () => {
  test("an unknown address answers 404 with a torn-out journal page and the way back", async ({ page }) => {
    const response = await page.goto("/does-not-exist");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "This page was torn out of the journal." })).toBeVisible();
    await expect(page).toHaveTitle(/^Page not found/);
    const wayBack = page.getByRole("navigation", { name: "Back to the journal" });

    for (const [name, path] of [
      ["Home", "/"],
      ["Music", "/music"],
      ["Tours", "/tours"],
      ["Swiftter", "/swiftter"],
    ])
      await expect(wayBack.getByRole("link", { name })).toHaveAttribute("href", path);
    await expectNoAxeViolations(page);
  });

  test("keeps the journal's paper under the header and footer in dark mode", async ({ page }) => {
    // Next's default 404 turned the page black in dark mode, under ink meant for paper (1.2:1).
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/does-not-exist");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(243, 234, 219)");
    await expectNoAxeViolations(page);
  });

  test("fits a 390px phone", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/does-not-exist");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("is still under reduced motion", async ({ page }) => {
    await page.goto("/does-not-exist");
    await expectReducedMotion(page);
  });
});

test.describe("Swiftter thread not found", () => {
  for (const [what, id] of [
    ["an unknown note", "00000000-0000-4000-8000-000000000000"],
    ["an id that is not a note's", "not-a-note"],
  ])
    test(`${what} answers 404 with a way back to the feed`, async ({ page }) => {
      const response = await page.goto(`/swiftter/p/${id}`);

      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1, name: "This note isn't on Swiftter." })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Back to Swiftter" }).getByRole("link", { name: "all notes" })).toHaveAttribute("href", "/swiftter");
      await expectNoAxeViolations(page);
      await page.setViewportSize(PHONE);
      await expectNoHorizontalOverflow(page);
    });
});
