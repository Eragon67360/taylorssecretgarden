/*
  Lighthouse CI (`npm run lighthouse`, and the `lighthouse` CI job): the
  production build under `next start`, Lighthouse's default mobile emulation
  (Moto G Power, slow 4G, 4x CPU throttling), 3 runs per page, judged on the
  median run. Accessibility below 0.9 fails; Performance below 0.9 warns.

  Why Performance only warns: on GitHub's shared runners the scores swing by
  up to 0.3 between runs of the same build (the first, cold run of a page is
  the usual outlier) and sit a few points under a local run of the same code.
  After #49 the CI medians are 0.88–0.93 (Home 0.90, Music 0.88, Tours 0.90,
  the Eras Tour 0.92, Swiftter 0.93): too close to 0.9 for an error that must
  not flake. `next start` serves HTTP/1.1 here, which Lighthouse's simulation
  scores lower than the HTTP/2 of production. Check Performance on the Vercel
  preview (PageSpeed Insights) before merging.
  Build first (`npm run build`).
*/
const PORT = process.env.LHCI_PORT ?? "3180";
const base = `http://localhost:${PORT}`;

module.exports = {
  ci: {
    collect: {
      startServerCommand: `npx next start -p ${PORT}`,
      startServerReadyPattern: "Ready",
      startServerReadyTimeout: 60000,
      // The last: a seeded Swiftter thread (scripts/seed-data.ts), eight replies deep.
      url: ["/", "/music", "/tours", "/tours/the-eras-tour", "/swiftter", "/swiftter/p/5eed0000-0000-4000-8000-000000000001"].map((path) => `${base}${path}`),
      numberOfRuns: 3,
      settings: {
        // Mobile is Lighthouse's default form factor; only the asserted categories run.
        onlyCategories: ["performance", "accessibility"],
        chromeFlags: "--no-sandbox --headless=new",
      },
    },
    assert: {
      aggregationMethod: "median-run",
      assertions: {
        "categories:performance": ["warn", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci/reports",
    },
  },
};
