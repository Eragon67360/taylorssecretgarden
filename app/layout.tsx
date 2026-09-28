import "@/styles/globals.css";
import { Metadata, Viewport } from "next";

import { siteConfig } from "@/config/site";
import {
  fontBody,
  fontDancing,
  fontHand,
  fontImpact,
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
        fontImpact.variable,
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
