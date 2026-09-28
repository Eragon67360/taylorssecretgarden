const PRODUCTION_URL = "https://taylorssecretgarden.vercel.app";
const previewUrl = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL;

export const siteConfig = {
  name: "Taylor's Secret Garden",
  /** Where absolute metadata URLs (the Open Graph card) point: the site itself, or a preview its own. */
  url: previewUrl ? `https://${previewUrl}` : PRODUCTION_URL,
  description:
    "A fan's scrapbook of every Taylor Swift Era: the Albums and their tracklists, the Tours, and Swiftter, where Swifties pass notes.",
  /** The journal's colours, for images drawn outside the CSS (icons, the Open Graph card). */
  colors: {
    paper: "#f3eadb",
    card: "#fffcf5",
    ink: "#2b1d14",
    soft: "#5a4535",
    accent: "#7e2a37",
    tape: "rgba(246, 226, 170, 0.8)",
    petalCentre: "#E9B949",
  },
};
