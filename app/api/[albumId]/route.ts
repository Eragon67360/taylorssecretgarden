import { getAlbumDetails } from "@/service/deezer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const albumId = req.nextUrl.pathname.split("/").pop() ?? "";

  return NextResponse.json(await getAlbumDetails(albumId));
}
