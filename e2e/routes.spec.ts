import tours from "../public/json/tours.json";

import { expect, test } from "./fixtures";

// Every public route answers 200 and shows its main heading, with no page
// errors or console errors (checked by the fixture).
const routes = [
  { path: "/", heading: "Taylor's Secret Garden" },
  { path: "/music", heading: "pick an Era. the page changes outfits." },
  { path: "/tours", heading: "Tours" },
  { path: "/swiftter", heading: "Swiftter" },
  { path: "/credits", heading: "Credits" },
  { path: "/sign-in", heading: "Sign in to Taylor's Secret Garden" },
];

for (const { path, heading } of routes) {
  test(`${path} shows "${heading}"`, async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  });
}

for (const { slug, tour } of tours) {
  test(`Tour page /tours/${slug} shows ${tour}`, async ({ page }) => {
    const response = await page.goto(`/tours/${slug}`);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: tour, exact: true })).toBeVisible();
  });
}

test("Swiftter shows the feed without an error page", async ({ page }) => {
  const response = await page.goto("/swiftter");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("feed", { name: "Notes" }).getByRole("article").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Something went wrong on this page." })).toBeHidden();
});

// Baseline security headers (next.config.ts), on pages, files and API routes
// alike. /api/preview/abc is refused before any Deezer call.
const SECURITY_HEADERS = {
  "content-security-policy": "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

test("every response carries the security headers, and none says it is Next.js", async ({ request }) => {
  for (const path of ["/", "/swiftter", "/sign-in", "/robots.txt", "/api/preview/abc"]) {
    const headers = (await request.get(path, { maxRedirects: 0 })).headers();

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) expect(headers[name], `${name} on ${path}`).toBe(value);
    expect(headers["x-powered-by"], `X-Powered-By on ${path}`).toBeUndefined();
  }
});
