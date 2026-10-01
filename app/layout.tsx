import "@/styles/globals.css";
import { Metadata, Viewport } from "next";

import { siteConfig } from "@/config/site";
// The Era faces' @font-face rules ship with the site-wide CSS: a face still
// downloads only when its Era is on screen, but a route using them no longer
// has a CSS chunk of its own that the nav's prefetch preloads and then leaves
// unused (a console warning on every other page).
import "@/config/era-fonts";
import { fontBody, fontHand, fontSerif, fontSerifItalic } from "@/config/fonts";
import { Analytics } from "@/components/analytics";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isIndexable } from "@/lib/indexing";
import { OPEN_GRAPH } from "@/lib/metadata";
import { cn } from "@/lib/utils";

import { Providers } from "./providers";

// Icons (app/icon.svg, app/apple-icon.tsx) and the Open Graph card
// (app/opengraph-image.tsx) are file conventions: Next adds their tags.
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name}: a Taylor Swift fan scrapbook`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  // No og:title/og:description here: a page's own <title> and description
  // (which link previews fall back to) beat one shared title on every page.
  // Each page adds its canonical link and og:url (pageMetadata, lib/metadata.ts).
  openGraph: OPEN_GRAPH,
  twitter: { card: "summary_large_image" },
  // Previews, local builds and CI stay out of search results (lib/indexing.ts).
  ...(!isIndexable() && { robots: { index: false, follow: false } }),
};

export const viewport: Viewport = {
  themeColor: siteConfig.colors.paper,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The font variables sit on <html> so the journal tokens on :root can use them.
    <html
      className={cn(fontHand.variable, fontBody.variable, fontSerif.variable, fontSerifItalic.variable)}
      lang="en"
    >
      <body className="flex min-h-dvh flex-col antialiased">
        <Providers>
          <SiteHeader />
          <main className="relative flex-1" id="main">
            {children}
          </main>
          <SiteFooter />
        </Providers>
        {/* Vercel serves the Analytics script (/_vercel/insights) on its deployments only: elsewhere it would 404. */}
        {process.env.VERCEL_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
