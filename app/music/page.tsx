import type { Metadata } from "next";

import { ReleasePage, releaseMetadata } from "@/components/music/release-page";

/*
  /music: the shelf, open on the first Album (lib/catalogue.ts), whose page it
  is. Old links to an Album, /music?album=<Deezer ID>, are sent on to its
  page before they get here (proxy.ts).
*/

export function generateMetadata(): Metadata {
  return releaseMetadata();
}

export default function Music() {
  return <ReleasePage slugs={[]} />;
}
