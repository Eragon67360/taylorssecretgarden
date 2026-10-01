import type { Metadata } from "next";

import { Toaster } from "sonner";

import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/metadata";

// The feed's metadata. A page under /swiftter (a Post's own page) inherits it,
// so it must set its own `alternates.canonical` and og:url (pageMetadata),
// or it would name the feed as its canonical page.
export const metadata: Metadata = {
  ...pageMetadata({
    description: "Swiftter, the fan feed of Taylor's Secret Garden: notes passed in class by Swifties.",
    path: "/swiftter",
  }),
  // A plain title here would drop the site's template for every page below;
  // passed on, a thread reads "<Member>'s note on Swiftter · Taylor's Secret Garden".
  title: { default: "Swiftter", template: `%s · ${siteConfig.name}` },
};

export default function SwiftterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Sonner's default colours: its "rich" palette fails WCAG AA contrast on success toasts. */}
      <Toaster position="bottom-center" />
      {children}
    </>
  );
}
