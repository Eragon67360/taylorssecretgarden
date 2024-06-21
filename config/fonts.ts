import { Fira_Code, Inter , Dancing_Script as Dancing, Playfair_Display } from "next/font/google";

export const fontInter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const fontFira = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira",
});

export const fontDancing = Dancing({
  subsets: ["latin"],
  variable: "--font-dancing",
});

export const fontPlayfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

