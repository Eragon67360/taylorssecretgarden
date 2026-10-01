"use client";

import { useEffect } from "react";

import { Button } from "@/components/scrapbook";
import { TornPage, WayOut } from "@/components/torn-page";

/**
 * A page that broke while rendering, inside the site's header and footer.
 * Server errors reach the browser without their message (Next keeps it in
 * the server logs); the digest shown here is what finds it there. No message
 * or stack is shown to visitors.
 */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // The browser's console keeps the details for whoever is debugging.
    /* eslint-disable-next-line no-console */
    console.error(error);
  }, [error]);

  return (
    <TornPage aside="the tape gave way. it happens to the best scrapbooks." kicker="Error · page came loose" title="Something went wrong on this page.">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
        <Button onClick={() => retry()}>Try again</Button>
        <WayOut label="Back to the journal" links={[{ href: "/", name: "Home" }]} />
      </div>
      {error.digest && (
        <p className="text-soft mt-7 text-[14px]">
          If it keeps happening, this reference helps find it: <code className="text-ink font-semibold">{error.digest}</code>
        </p>
      )}
    </TornPage>
  );
}
