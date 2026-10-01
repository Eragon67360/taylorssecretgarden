/** The canonical address (the apex redirects here). */
export const PRODUCTION_URL = "https://www.taylorssecretgarden.com";
const previewUrl = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL;

export const siteConfig = {
  name: "Taylor's Secret Garden",
  /**
   * Where absolute URLs point (canonical links, the Open Graph card, the
   * sitemap, llms.txt, JSON-LD): the site itself, or a preview its own.
   */
  url: previewUrl ? `https://${previewUrl}` : PRODUCTION_URL,
  description: "A fan's scrapbook of every Taylor Swift Era: the Albums and their tracklists, the Tours, and Swiftter, where Swifties pass notes.",
  /** Who publishes the site, as the legal notice, privacy policy and terms name him: a private individual. */
  publisher: "Thomas Moser",
  /**
   * Where Members and visitors write: rights requests, reports, human reviews,
   * the legal notice's contact. An alias on the domain (Squarespace email
   * forwarding) to the owner's inbox: his personal address is never published.
   */
  contactEmail: "contact@taylorssecretgarden.com",
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
