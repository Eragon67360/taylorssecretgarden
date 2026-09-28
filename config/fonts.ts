import { Caveat, Dancing_Script as Dancing, Fraunces, Inter, Karla, Playfair_Display, UnifrakturMaguntia } from "next/font/google";

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
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-fraunces",
  fallback: ["Georgia", "serif"],
});

/*
  Faces of the pages not yet redesigned (Music, Tour pages).
  Not preloaded: they download only on the pages that still use them, and go
  away with those pages (#20-#24).
*/
export const fontInter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  preload: false,
});

export const fontDancing = Dancing({
  subsets: ["latin"],
  variable: "--font-dancing",
  preload: false,
});

export const fontPlayfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  preload: false,
});

export const fontUnifraktur = UnifrakturMaguntia({
  weight: "400",
  style: "normal",
  subsets: ["latin"],
  variable: "--font-unifraktur",
  preload: false,
});
