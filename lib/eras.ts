import type { CSSProperties } from "react";

import { eraFontFamilies } from "@/config/era-fonts";

/*
  The Era look module: every Era's look, defined once (which Era each
  Album belongs to is in lib/catalogue.ts; see CONTEXT.md). Pages apply a look by rendering inside
  <EraScope era="…"> (components/era-scope.tsx), which overrides the journal's
  CSS variables (styles/globals.css) with the values below.

  Palettes start from prototype C ("Secret Garden"). `ink` and `soft` pass
  WCAG AA (4.5:1) on both `paper` and `card`, and `onAccent` on `accent`; the
  styleguide's axe run verifies every Era.
*/

export const ERA_SLUGS = [
  "debut",
  "fearless",
  "speak-now",
  "red",
  "1989",
  "reputation",
  "lover",
  "folklore",
  "evermore",
  "midnights",
  "ttpd",
  "showgirl",
] as const;

export type EraSlug = (typeof ERA_SLUGS)[number];

/** What an Era keeps pressed between the pages: a flower, or (The Life of a Showgirl) a showgirl's feather. */
export type Flower = "daisy" | "fern" | "lavender" | "rose" | "leaf" | "feather";

/** Every pressed flower (components/scrapbook/pressed-flower.tsx), for the styleguide. */
export const FLOWERS: readonly Flower[] = ["daisy", "fern", "lavender", "rose", "leaf", "feather"];

export type EraLook = {
  slug: EraSlug;
  /** The Era's name as fans write it (the Album title, in its own casing). */
  name: string;
  /** What a fan writes on the polaroid. */
  short: string;
  year: number;
  /** Page background. */
  paper: string;
  /** Notebook, polaroid and note surfaces. */
  card: string;
  /** Body text; AA on paper and card. */
  ink: string;
  /** Secondary text; AA on paper and card. */
  soft: string;
  /** Decorative ink: highlighter, beads, focus ring, active controls. */
  accent: string;
  /** Text on an accent background; AA on accent. */
  onAccent: string;
  /** Notebook ruling and hairlines. */
  line: string;
  /** Washi tape. */
  tape: string;
  flower: Flower;
  /** Fan-insider sticky note. */
  note: string;
  /** Display face: a CSS font-family list (config/era-fonts.ts). */
  font: string;
  /** Display face weight and style, when the face is not a plain 400 roman. */
  fontWeight?: number;
  fontItalic?: boolean;
  /** Dark paper (reputation, Midnights). */
  dark?: boolean;
  /** Flannel plaid over the paper (evermore). */
  plaid?: boolean;
};

export const ERA_LOOKS: Record<EraSlug, EraLook> = {
  debut: {
    slug: "debut",
    name: "Taylor Swift",
    short: "debut",
    year: 2006,
    paper: "#E3EFE6",
    card: "#F7FBF7",
    ink: "#0F3A33",
    soft: "#2F5E55",
    accent: "#237A68",
    onAccent: "#FFFFFF",
    line: "#B9D6CC",
    tape: "rgba(120, 196, 176, 0.55)",
    flower: "daisy",
    note: "a pickup truck, a teardrop on the guitar, and one big dream",
    font: eraFontFamilies.debut,
  },
  fearless: {
    slug: "fearless",
    name: "Fearless",
    short: "Fearless",
    year: 2008,
    paper: "#F5E8C4",
    card: "#FFFBEE",
    ink: "#3A2804",
    soft: "#6A4E12",
    accent: "#C99A1E",
    onAccent: "#2A1C00",
    line: "#E9D59C",
    tape: "rgba(236, 196, 92, 0.55)",
    flower: "daisy",
    note: "sparkly dress, sparkly guitar, hair flip. 2008 forever",
    font: eraFontFamilies.fearless,
    fontWeight: 700,
  },
  "speak-now": {
    slug: "speak-now",
    name: "Speak Now",
    short: "Speak Now",
    year: 2010,
    paper: "#ECE0F5",
    card: "#FBF7FE",
    ink: "#2C1044",
    soft: "#5A3A78",
    accent: "#8A4CC0",
    onAccent: "#FFFFFF",
    line: "#D8C4EA",
    tape: "rgba(176, 128, 220, 0.5)",
    flower: "lavender",
    note: "wrote the whole thing by herself. wearing purple, obviously",
    font: eraFontFamilies["speak-now"],
  },
  red: {
    slug: "red",
    name: "Red",
    short: "Red",
    year: 2012,
    paper: "#F5E3DE",
    card: "#FFF8F6",
    ink: "#3A0A0E",
    soft: "#6E2A2E",
    accent: "#B3141C",
    onAccent: "#FFFFFF",
    line: "#EBC4BD",
    tape: "rgba(214, 72, 72, 0.45)",
    flower: "rose",
    note: "the scarf is still at his sister's house. 10 minutes of proof",
    font: eraFontFamilies.red,
  },
  "1989": {
    slug: "1989",
    name: "1989",
    short: "1989",
    year: 2014,
    paper: "#E2EEF7",
    card: "#FAFDFF",
    ink: "#0D2C47",
    soft: "#2E5577",
    accent: "#2B74AE",
    onAccent: "#FFFFFF",
    line: "#BFD8EC",
    tape: "rgba(128, 186, 230, 0.55)",
    flower: "leaf",
    note: "polaroids, seagulls, a cropped top. welcome to new york",
    font: eraFontFamilies["1989"],
  },
  reputation: {
    slug: "reputation",
    name: "reputation",
    short: "rep",
    year: 2017,
    paper: "#161616",
    card: "#232323",
    ink: "#EDEDED",
    soft: "#B8B8B8",
    accent: "#C9C9C9",
    onAccent: "#111111",
    line: "#3A3A3A",
    tape: "rgba(200, 200, 200, 0.28)",
    flower: "fern",
    note: "the old Taylor can't come to the phone right now. (why? she's dead)",
    font: eraFontFamilies.reputation,
    dark: true,
  },
  lover: {
    slug: "lover",
    name: "Lover",
    short: "Lover",
    year: 2019,
    paper: "#FBE3EE",
    card: "#FFF8FB",
    ink: "#4A1433",
    soft: "#7A3A60",
    accent: "#E0588F",
    onAccent: "#2A0718",
    line: "#F2C6D8",
    tape: "rgba(150, 200, 236, 0.6)",
    flower: "rose",
    note: "cruel summer should have been the single. we were right",
    font: eraFontFamilies.lover,
  },
  folklore: {
    slug: "folklore",
    name: "folklore",
    short: "folklore",
    year: 2020,
    paper: "#E4E3E0",
    card: "#F7F6F3",
    ink: "#262626",
    soft: "#555555",
    accent: "#6A6A66",
    onAccent: "#FFFFFF",
    line: "#CFCEC9",
    tape: "rgba(170, 168, 160, 0.5)",
    flower: "fern",
    note: "cardigan weather, all year round. cabin optional",
    font: eraFontFamilies.folklore,
  },
  evermore: {
    slug: "evermore",
    name: "evermore",
    short: "evermore",
    year: 2020,
    paper: "#EFDFCC",
    card: "#FBF3E9",
    ink: "#381C0F",
    soft: "#6A3E27",
    accent: "#A8481E",
    onAccent: "#FFFFFF",
    line: "#E0C6AA",
    tape: "rgba(190, 110, 60, 0.45)",
    flower: "leaf",
    note: "'tis the damn season. flannel mandatory",
    font: eraFontFamilies.evermore,
    fontWeight: 700,
    fontItalic: true,
    plaid: true,
  },
  midnights: {
    slug: "midnights",
    name: "Midnights",
    short: "Midnights",
    year: 2022,
    paper: "#131D36",
    card: "#1C2946",
    ink: "#EEE8F6",
    soft: "#BDB3D6",
    accent: "#B6A3E0",
    onAccent: "#131D36",
    line: "#2E3C5E",
    tape: "rgba(182, 163, 224, 0.35)",
    flower: "lavender",
    note: "meet me at midnight (it's 3am, she's still awake)",
    font: eraFontFamilies.midnights,
    fontWeight: 700,
    dark: true,
  },
  ttpd: {
    slug: "ttpd",
    name: "The Tortured Poets Department",
    short: "TTPD",
    year: 2024,
    paper: "#F2EEE3",
    card: "#FCFAF4",
    ink: "#141414",
    soft: "#474440",
    accent: "#141414",
    onAccent: "#F2EEE3",
    line: "#DAD4C4",
    tape: "rgba(40, 40, 40, 0.18)",
    flower: "fern",
    note: "31 songs at 2am. the chairman has been notified",
    font: eraFontFamilies.ttpd,
  },
  showgirl: {
    slug: "showgirl",
    name: "The Life of a Showgirl",
    short: "Showgirl",
    year: 2025,
    // Mint water and orange glitter over deep teal, from the Album's cover.
    paper: "#DDF1EA",
    card: "#F6FCF9",
    ink: "#0E3B35",
    soft: "#2E5E57",
    accent: "#E0561B",
    onAccent: "#1E0A00",
    line: "#B5DDD0",
    tape: "rgba(232, 84, 28, 0.45)",
    flower: "feather",
    note: "orange glitter, one feather boa, and ophelia finally gets saved. encore!",
    font: eraFontFamilies.showgirl,
  },
};

/** The colours and display face of a look: what `eraVariables` applies (an Era's, or a Tour's own). */
export type EraPalette = Pick<
  EraLook,
  "paper" | "card" | "ink" | "soft" | "accent" | "onAccent" | "line" | "tape" | "font" | "fontWeight" | "fontItalic"
>;

/** Every Era's look, in release order. */
export const ERAS: EraLook[] = ERA_SLUGS.map((slug) => ERA_LOOKS[slug]);

/** The paper an Era's pages are printed on. */
export type PaperTexture = "grain" | "dark" | "plaid";

/** The paper texture of an Era (the journal itself, without one, is plain grain). */
export function paperTexture(look?: Pick<EraLook, "dark" | "plaid">): PaperTexture {
  if (look?.plaid) return "plaid";

  return look?.dark ? "dark" : "grain";
}

/** The CSS variables that apply an Era's look (the journal tokens in styles/globals.css). */
export function eraVariables(look: EraPalette): CSSProperties {
  return {
    "--paper": look.paper,
    "--card": look.card,
    "--ink": look.ink,
    "--soft": look.soft,
    "--line": look.line,
    "--accent": look.accent,
    "--on-accent": look.onAccent,
    "--tape": look.tape,
    "--era-font": look.font,
    "--era-font-weight": String(look.fontWeight ?? 400),
    "--era-font-style": look.fontItalic ? "italic" : "normal",
  } as CSSProperties;
}

export function isEraSlug(value: unknown): value is EraSlug {
  return typeof value === "string" && (ERA_SLUGS as readonly string[]).includes(value);
}
