"use client";

import type { CSSProperties } from "react";

/*
  The last resort: the root layout itself broke, so this page replaces it,
  with its own <html> and <body>. The site's stylesheet and fonts may be
  missing here, so it is styled inline in the journal's colours (the same
  paper and ink as styles/globals.css) with system fonts, and pins its own
  colour scheme so a dark-mode browser keeps the ink readable.
*/
const PAPER = "#f3eadb";
const CARD = "#fffcf5";
const INK = "#2b1d14";
const SOFT = "#5a4535";
const ACCENT = "#7e2a37";
const ON_ACCENT = "#fff6ec";

const styles = {
  body: {
    margin: 0,
    minHeight: "100dvh",
    background: PAPER,
    color: INK,
    colorScheme: "light",
    fontFamily: "system-ui, sans-serif",
    display: "grid",
    placeItems: "center",
  },
  page: {
    boxSizing: "border-box",
    width: "min(640px, calc(100% - 32px))",
    margin: "48px 16px",
    padding: "40px 28px",
    background: CARD,
    boxShadow: "0 14px 30px -14px rgba(0,0,0,.35)",
    rotate: "-0.6deg",
  },
  kicker: { margin: 0, color: SOFT, fontSize: 11, fontWeight: 700, letterSpacing: ".26em", textTransform: "uppercase" },
  title: { margin: "8px 0 0", fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 7vw, 3rem)", lineHeight: 1.05, fontWeight: 600 },
  text: { margin: "16px 0 0", color: SOFT, fontSize: 17, lineHeight: 1.6 },
  actions: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px 28px", marginTop: 28 },
  button: {
    minHeight: 44,
    padding: "0 20px",
    border: 0,
    borderRadius: 4,
    background: ACCENT,
    color: ON_ACCENT,
    font: "inherit",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  link: { color: INK, fontWeight: 700, textUnderlineOffset: 4 },
} satisfies Record<string, CSSProperties>;

// Focus rings in ink, since no stylesheet may have loaded to draw them.
const FOCUS_CSS = `.global-error :focus-visible { outline: 2.5px solid ${INK}; outline-offset: 3px; }`;

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <head>
        <title>Something went wrong · Taylor&apos;s Secret Garden</title>
        <meta content="noindex" name="robots" />
        <style>{FOCUS_CSS}</style>
      </head>
      <body className="global-error" style={styles.body}>
        <main style={styles.page}>
          <p style={styles.kicker}>Error · the journal came apart</p>
          <h1 style={styles.title}>Something went wrong.</h1>
          <p style={styles.text}>The whole journal came unstuck for a moment. Trying again usually glues it back.</p>
          <div style={styles.actions}>
            <button style={styles.button} type="button" onClick={() => retry()}>
              Try again
            </button>
            {/* A full page load, not the router: the app around this page is what broke. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={styles.link}>
              Back to Home
            </a>
          </div>
          {error.digest && (
            <p style={{ ...styles.text, fontSize: 14 }}>
              If it keeps happening, this reference helps find it: <code style={{ color: INK }}>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
