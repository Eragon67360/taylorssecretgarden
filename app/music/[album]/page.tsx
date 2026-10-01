import type { Metadata } from "next";

import { ReleasePage, releaseMetadata } from "@/components/music/release-page";
import { CATALOGUE } from "@/lib/catalogue";

type AlbumPageProps = { params: Promise<{ album: string }> };

// Only the catalogue's Albums have a page; any other slug is a 404.
export const dynamicParams = false;

/** Every Album but the first, whose page is /music (next.config.ts sends /music/<its slug> there). */
export function generateStaticParams() {
  return CATALOGUE.slice(1).map(({ slug }) => ({ album: slug }));
}

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
  return releaseMetadata((await params).album);
}

/** An Album's page: /music/folklore. */
export default async function AlbumPage({ params }: AlbumPageProps) {
  return <ReleasePage slugs={[(await params).album]} />;
}
