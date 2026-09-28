import { NextResponse } from "next/server";

import { getShelf } from "@/components/music/catalogue";

/**
 * The catalogue (lib/catalogue.ts): every Album in Era order, each with its
 * Era, edition, release year and, for a Taylor's Version, the Album it re-records.
 */
export async function GET() {
  const items = (await getShelf()).map(({ id, name, images, era, edition, year, released, taylorsVersion, reRecords }) => ({
    id,
    name,
    images,
    era,
    edition,
    year,
    released,
    taylorsVersion,
    reRecords,
  }));

  return NextResponse.json({ items });
}
