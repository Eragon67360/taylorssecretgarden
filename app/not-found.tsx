import type { Metadata } from "next";

import { TornPage, WayOut } from "@/components/torn-page";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

/**
 * Any address the site does not have. In the journal's own paper: Next's
 * default 404 brings its own colours, which in dark mode turned the page black
 * under the header and footer's ink.
 */
export default function NotFound() {
  return (
    <TornPage aside="someone tore it out. we suspect whoever still has the scarf." kicker="404 · page not found" title="This page was torn out of the journal.">
      <p className="text-soft max-w-[34rem] text-[17px] leading-relaxed">
        The address may have a typo, or the page was never kept. Everything else is still where we left it:
      </p>
      <div className="mt-5">
        <WayOut
          label="Back to the journal"
          links={[
            { href: "/", name: "Home" },
            { href: "/music", name: "Music" },
            { href: "/tours", name: "Tours" },
            { href: "/swiftter", name: "Swiftter" },
          ]}
        />
      </div>
    </TornPage>
  );
}
