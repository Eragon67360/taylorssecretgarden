import localFont from "next/font/local";

/*
  One display face per Era, self-hosted (assets/fonts/, fetched from Google
  Fonts by scripts/build-fonts.py). None is preloaded: the browser downloads a
  face only when text set in it is on screen, i.e. when that Era is shown (the
  Era container sets `--era-font`, see components/era-scope.tsx). next/font's
  metric-adjusted fallback, measured from each file, plus a close system face
  keep the swap from shifting the layout.
*/

const Rye = localFont({ src: "../assets/fonts/rye.woff2", weight: "400", display: "swap", preload: false, fallback: ["Georgia", "serif"], adjustFontFallback: "Times New Roman" });
const Cinzel = localFont({ src: "../assets/fonts/cinzel.woff2", weight: "600 700", display: "swap", preload: false, fallback: ["Georgia", "serif"], adjustFontFallback: "Times New Roman" });
const Pinyon_Script = localFont({ src: "../assets/fonts/pinyon-script.woff2", weight: "400", display: "swap", preload: false, fallback: ["cursive"] });
const Abril_Fatface = localFont({ src: "../assets/fonts/abril-fatface.woff2", weight: "400", display: "swap", preload: false, fallback: ["Georgia", "serif"], adjustFontFallback: "Times New Roman" });
const Permanent_Marker = localFont({ src: "../assets/fonts/permanent-marker.woff2", weight: "400", display: "swap", preload: false, fallback: ["cursive"] });
const UnifrakturMaguntia = localFont({ src: "../assets/fonts/unifraktur-maguntia.woff2", weight: "400", display: "swap", preload: false, fallback: ["Georgia", "serif"], adjustFontFallback: "Times New Roman" });
const Pacifico = localFont({ src: "../assets/fonts/pacifico.woff2", weight: "400", display: "swap", preload: false, fallback: ["cursive"] });
const IM_Fell_English = localFont({
  src: [
    { path: "../assets/fonts/im-fell-english.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/im-fell-english-italic.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
  preload: false,
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});
const Cormorant_Garamond = localFont({
  src: [{ path: "../assets/fonts/cormorant-garamond-italic.woff2", weight: "600 700", style: "italic" }],
  display: "swap",
  preload: false,
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});
const Bodoni_Moda = localFont({ src: "../assets/fonts/bodoni-moda.woff2", weight: "500 700", display: "swap", preload: false, fallback: ["Didot", "Georgia", "serif"], adjustFontFallback: "Times New Roman" });
const Special_Elite = localFont({ src: "../assets/fonts/special-elite.woff2", weight: "400", display: "swap", preload: false, fallback: ["Courier New", "monospace"] });
// Condensed marquee capitals, like the lights over a Vegas stage door.
const Bebas_Neue = localFont({ src: "../assets/fonts/bebas-neue.woff2", weight: "400", display: "swap", preload: false, fallback: ["Impact", "Arial Narrow", "sans-serif"] });

/** Each Era's display face: the CSS font-family list to set on its container. */
export const eraFontFamilies = {
  debut: Rye.style.fontFamily,
  fearless: Cinzel.style.fontFamily,
  "speak-now": Pinyon_Script.style.fontFamily,
  red: Abril_Fatface.style.fontFamily,
  "1989": Permanent_Marker.style.fontFamily,
  reputation: UnifrakturMaguntia.style.fontFamily,
  lover: Pacifico.style.fontFamily,
  folklore: IM_Fell_English.style.fontFamily,
  evermore: Cormorant_Garamond.style.fontFamily,
  midnights: Bodoni_Moda.style.fontFamily,
  ttpd: Special_Elite.style.fontFamily,
  showgirl: Bebas_Neue.style.fontFamily,
} as const;
