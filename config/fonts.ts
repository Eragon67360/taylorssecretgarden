import { Caveat, Fraunces, Karla } from "next/font/google";

/*
  The journal's own faces, used on every page and preloaded: a pen (Caveat),
  a clean text face (Karla) and a bookish heading serif (Fraunces). Exposed as
  the `font-hand`, `font-body` and `font-serif` utilities (styles/globals.css).
  Each Era's display face lives in config/era-fonts.ts and is not preloaded.
*/
export const fontHand = Caveat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-caveat",
  fallback: ["Segoe Print", "Bradley Hand", "cursive"],
});

export const fontBody = Karla({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-karla",
  fallback: ["system-ui", "sans-serif"],
});

export const fontSerif = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  fallback: ["Georgia", "serif"],
});

/*
  Fraunces italic, for the few italic words set in it (the `font-serif-italic`
  utility, and the Eras Tour's display face). Not preloaded: most pages never
  use it, and a preloaded face is downloaded on every page whether it is used
  or not (~45 KB). Its own family (next/font names each call uniquely), so
  italic serif text elsewhere is synthesised from the upright face.
*/
export const fontSerifItalic = Fraunces({
  subsets: ["latin"],
  style: "italic",
  display: "swap",
  preload: false,
  variable: "--font-fraunces-italic",
  fallback: ["Georgia", "serif"],
});
