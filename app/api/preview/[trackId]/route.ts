import { NextResponse } from "next/server";

import { getTrackPreview } from "@/service/deezer";

/**
 * Redirects to a track's 30-second Deezer preview, freshly signed (see
 * getTrackPreview): the Music page's player points its audio element here.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;

  if (!/^\d+$/.test(trackId)) return new NextResponse("Unknown track", { status: 404 });

  let preview: string | undefined;

  try {
    preview = await getTrackPreview(trackId);
  } catch {
    return new NextResponse("Deezer is unavailable", { status: 502 });
  }
  if (!preview) return new NextResponse("No preview for this track", { status: 404 });

  return NextResponse.redirect(preview, { headers: { "Cache-Control": "no-store" } });
}
