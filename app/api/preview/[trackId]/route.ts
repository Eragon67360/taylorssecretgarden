import { NextResponse } from "next/server";

import { isCatalogueTrack, isTrackId } from "@/service/catalogue-tracks";
import { getTrackPreview } from "@/service/deezer";

/** A 404, kept by browsers and the CDN for 5 minutes: asking again for the same unknown track costs nothing. */
const notFound = (message: string) => new NextResponse(message, { status: 404, headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } });

/**
 * Redirects to a track's 30-second Deezer preview, freshly signed (see
 * getTrackPreview): the Music page's player points its audio element here.
 * Only tracks of the catalogue's Albums and Versions (service/catalogue-tracks.ts);
 * any other ID is 404 without asking Deezer.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;

  if (!isTrackId(trackId)) return notFound("Unknown track");

  let preview: string | undefined;

  try {
    if (!(await isCatalogueTrack(trackId))) return notFound("Unknown track");
    preview = await getTrackPreview(trackId);
  } catch {
    return new NextResponse("Deezer is unavailable", { status: 502 });
  }
  if (!preview) return notFound("No preview for this track");

  return NextResponse.redirect(preview, { headers: { "Cache-Control": "no-store" } });
}
