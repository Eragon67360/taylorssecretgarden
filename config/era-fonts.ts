import {
  Abril_Fatface,
  Bebas_Neue,
  Bodoni_Moda,
  Cinzel,
  Cormorant_Garamond,
  IM_Fell_English,
  Pacifico,
  Permanent_Marker,
  Pinyon_Script,
  Rye,
  Special_Elite,
  UnifrakturMaguntia,
} from "next/font/google";

/*
  One display face per Era. None is preloaded: the browser downloads a face
  only when text set in it is on screen, i.e. when that Era is shown (the Era
  container sets `--era-font`, see components/era-scope.tsx). next/font's
  metric-adjusted fallback (adjustFontFallback, on by default) plus a close
  system face keep the swap from shifting the layout.
*/

const debut = Rye({ subsets: ["latin"], display: "swap", preload: false, weight: "400", fallback: ["Georgia", "serif"] });
const fearless = Cinzel({ subsets: ["latin"], display: "swap", preload: false, weight: ["600", "700"], fallback: ["Georgia", "serif"] });
const speakNow = Pinyon_Script({ subsets: ["latin"], display: "swap", preload: false, weight: "400", fallback: ["cursive"] });
const red = Abril_Fatface({ subsets: ["latin"], display: "swap", preload: false, weight: "400", fallback: ["Georgia", "serif"] });
const nineteen89 = Permanent_Marker({ subsets: ["latin"], display: "swap", preload: false, weight: "400", fallback: ["cursive"] });
const reputation = UnifrakturMaguntia({ subsets: ["latin"], display: "swap", preload: false, weight: "400", fallback: ["Georgia", "serif"] });
const lover = Pacifico({ subsets: ["latin"], display: "swap", preload: false, weight: "400", fallback: ["cursive"] });
const folklore = IM_Fell_English({ subsets: ["latin"], display: "swap", preload: false, weight: "400", style: ["normal", "italic"], fallback: ["Georgia", "serif"] });
const evermore = Cormorant_Garamond({ subsets: ["latin"], display: "swap", preload: false, weight: ["600", "700"], style: ["italic"], fallback: ["Georgia", "serif"] });
const midnights = Bodoni_Moda({ subsets: ["latin"], display: "swap", preload: false, weight: ["500", "700"], fallback: ["Didot", "Georgia", "serif"] });
const ttpd = Special_Elite({ subsets: ["latin"], display: "swap", preload: false, weight: "400", fallback: ["Courier New", "monospace"] });
// Condensed marquee capitals, like the lights over a Vegas stage door.
const showgirl = Bebas_Neue({ subsets: ["latin"], display: "swap", preload: false, weight: "400", fallback: ["Impact", "Arial Narrow", "sans-serif"] });

/** Each Era's display face: the CSS font-family list to set on its container. */
export const eraFontFamilies = {
  debut: debut.style.fontFamily,
  fearless: fearless.style.fontFamily,
  "speak-now": speakNow.style.fontFamily,
  red: red.style.fontFamily,
  "1989": nineteen89.style.fontFamily,
  reputation: reputation.style.fontFamily,
  lover: lover.style.fontFamily,
  folklore: folklore.style.fontFamily,
  evermore: evermore.style.fontFamily,
  midnights: midnights.style.fontFamily,
  ttpd: ttpd.style.fontFamily,
  showgirl: showgirl.style.fontFamily,
} as const;
