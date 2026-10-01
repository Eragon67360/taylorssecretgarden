import { type NextRequest, NextResponse } from "next/server";

// Relative import: the catalogue alone, no app module the proxy has no use for.
import { pathOfDeezerId } from "./lib/catalogue";

/*
  Album pages used to be /music?album=<Deezer ID>; they are /music/<album>
  and /music/<album>/<version> now (lib/catalogue.ts). Every old link (a
  catalogue ID, a Version's, a regional twin or an alias) is sent on for good
  (308) to its page, without the `album` parameter: a redirect in
  next.config.ts would keep it, since Next passes the query on. An ID the
  catalogue does not know stays on /music, which opens the first Album.

  The matcher runs this only for /music with an `album` parameter, so every
  other request (and plain /music) goes straight to its prerendered page.
*/
export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname === "/music" ? pathOfDeezerId(url.searchParams.get("album") ?? undefined) : undefined;

  if (!path) return NextResponse.next();
  const destination = url.clone();

  destination.pathname = path;
  destination.searchParams.delete("album");

  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: [{ source: "/music", has: [{ type: "query", key: "album" }] }],
};
