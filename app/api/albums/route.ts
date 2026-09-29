import { NextResponse } from "next/server";

import { getShelf } from "@/components/music/catalogue";
import { CATALOGUE } from "@/lib/catalogue";

/**
 * The catalogue (lib/catalogue.ts): every Album in Era order, each with its
 * Era, edition, release year, its other versions on Deezer and, for a
 * Taylor's Version, the Album it re-records.
 */
export async function GET() {
  const items = (await getShelf()).map(({ id, catalogueId, name, images, era, edition, year, released, taylorsVersion, reRecords }) => ({
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

  return NextResponse.json({ items });
}
