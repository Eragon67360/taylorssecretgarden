import localFont from "next/font/local";

/*
  The journal's own faces, used on every page and preloaded: a pen (Caveat),
  a clean text face (Karla) and a bookish heading serif (Fraunces). Exposed as
  the `font-hand`, `font-body` and `font-serif` utilities (styles/globals.css).
  Each Era's display face lives in config/era-fonts.ts and is not preloaded.

  All three are self-hosted (assets/fonts/, built by scripts/build-fonts.py),
  so the build never downloads fonts. Caveat and Fraunces are static cuts of
  the one weight the site sets them in, half the size of Google's variable
  files; Karla is Google's variable file. Each face is declared for a weight range,
  so text asking for another weight in that range uses it as is (no faux bold).
*/
const Caveat = localFont({
  // Caveat Bold: the pen writes bold everywhere.
  src: [{ path: "../assets/fonts/caveat-700.woff2", weight: "400 700", style: "normal" }],
  display: "swap",
  variable: "--font-caveat",
  fallback: ["Segoe Print", "Bradley Hand", "cursive"],
});

// Karla, variable (200–800), as Google serves it.
const Karla = localFont({
  src: [{ path: "../assets/fonts/karla.woff2", weight: "200 800", style: "normal" }],
  display: "swap",
  variable: "--font-karla",
  fallback: ["system-ui", "sans-serif"],
});

export const fontBody = Karla;

const Fraunces = localFont({
  // Fraunces SemiBold: the journal's headings.
  src: [{ path: "../assets/fonts/fraunces-600.woff2", weight: "100 900", style: "normal" }],
  display: "swap",
  variable: "--font-fraunces",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});

/*
  Fraunces italic (SemiBold, like the headings), for the few italic words set
  in it: the `font-serif-italic` utility and the Eras Tour's display face.
  Not preloaded: Next preloads a root layout's faces on every page, and most
  pages never use this one. Its own family, so italic serif text elsewhere is
  synthesised from the upright face.
*/
const FrauncesItalic = localFont({
  src: [{ path: "../assets/fonts/fraunces-italic-600.woff2", weight: "100 900", style: "italic" }],
  display: "swap",
  preload: false,
  variable: "--font-fraunces-italic",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});

// Named after the typeface: next/font/local takes the family name from the binding.
export { Caveat as fontHand, Fraunces as fontSerif, FrauncesItalic as fontSerifItalic };
