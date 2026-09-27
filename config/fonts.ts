import { Anton, Inter, Dancing_Script as Dancing, Playfair_Display, UnifrakturMaguntia } from "next/font/google";

export const fontInter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Impact-style display face for the home page captions. Impact itself is not
// installed on every OS (nor licensed for the web), so Anton stands in.
export const fontImpact = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-impact",
});

export const fontDancing = Dancing({
  subsets: ["latin"],
  variable: "--font-dancing",
});

export const fontPlayfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const fontUnifraktur = UnifrakturMaguntia({
  weight: "400",
  style: "normal",
  subsets: ["latin"],
  variable: "--font-unifraktur",
});
