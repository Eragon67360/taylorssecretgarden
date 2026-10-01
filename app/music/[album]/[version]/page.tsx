import type { Metadata } from "next";

import { ReleasePage, releaseMetadata } from "@/components/music/release-page";
import { CATALOGUE } from "@/lib/catalogue";

type VersionPageProps = { params: Promise<{ album: string; version: string }> };

// Only the catalogue's Versions have a page; any other slug is a 404.
export const dynamicParams = false;

/** Every Version of every Album, the first Album's included: /music/taylor-swift/standard-edition. */
export function generateStaticParams() {
  return CATALOGUE.flatMap(({ slug, versions = [] }) => versions.map((version) => ({ album: slug, version: version.slug })));
}

export async function generateMetadata({ params }: VersionPageProps): Promise<Metadata> {
  const { album, version } = await params;

  return releaseMetadata(album, version);
}

/** A Version's page: /music/folklore/the-long-pond-studio-sessions. */
export default async function VersionPage({ params }: VersionPageProps) {
  const { album, version } = await params;

  return <ReleasePage slugs={[album, version]} />;
}
