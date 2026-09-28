import { NextRequest, NextResponse } from "next/server";

import { getAlbumDetails } from "@/service/deezer";

export async function GET(req: NextRequest) {
  const albumId = req.nextUrl.pathname.split("/").pop() ?? "";

  return NextResponse.json(await getAlbumDetails(albumId));
}
