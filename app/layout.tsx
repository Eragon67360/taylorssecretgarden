import "@/styles/globals.css";
import { Metadata, Viewport } from "next";

import { siteConfig } from "@/config/site";
// The Era faces' @font-face rules ship with the site-wide CSS: a face still
// downloads only when its Era is on screen, but a route using them no longer
// has a CSS chunk of its own that the nav's prefetch preloads and then leaves
// unused (a console warning on every other page).
import "@/config/era-fonts";
import {
  fontBody,
  fontDancing,
  fontHand,
  fontInter,
  fontPlayfair,
  fontSerif,
  fontUnifraktur,
} from "@/config/fonts";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3eadb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The font variables sit on <html> so the journal tokens on :root can use them.
    <html
      className={cn(
        fontHand.variable,
        fontBody.variable,
        fontSerif.variable,
        fontInter.variable,
        fontDancing.variable,
        fontPlayfair.variable,
        fontUnifraktur.variable,
      )}
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
      </body>
    </html>
  );
}
