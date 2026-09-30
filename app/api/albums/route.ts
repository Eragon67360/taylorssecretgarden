import { NextResponse } from "next/server";

import { getShelf } from "@/components/music/catalogue";
import { CATALOGUE } from "@/lib/catalogue";

/*
  Public catalogue data, the same for everyone: the CDN keeps it for an hour
  and serves it stale for a day while it refreshes (the Deezer data behind it
  is itself cached for a day, service/deezer.ts). An error is never cached.
*/
const CACHED = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };
const UNCACHED = { "Cache-Control": "no-store" };

/**
 * The catalogue (lib/catalogue.ts): every Album in Era order, each with its
 * Era, edition, release year, its other versions on Deezer and, for a
 * Taylor's Version, the Album it re-records. While Deezer fails, a 502 with a
 * JSON error rather than Albums without covers.
 */
export async function GET() {
  const shelf = await getShelf().catch(() => undefined);

  // The shelf leaves an Album Deezer failed without a cover (components/music/catalogue.ts).
  if (!shelf || shelf.some(({ images }) => !images.length)) {
    return NextResponse.json({ error: "Deezer is unavailable, try again shortly." }, { status: 502, headers: UNCACHED });
  }

  const items = shelf.map(({ id, catalogueId, name, images, era, edition, year, released, taylorsVersion, reRecords }) => ({
    id,
    name,
    images,
    era,
    edition,
    year,
    released,
    taylorsVersion,
    reRecords,
    versions: CATALOGUE.find((album) => album.id === catalogueId)?.versions ?? [],
  }));

  return NextResponse.json({ items }, { headers: CACHED });
}
