import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  // Only the API asks who is signed in on the server (auth() in
  // app/api/swiftter/posts). Pages read the Member on the client, so they skip
  // the proxy and, with it, Clerk's handshake redirect on a first visit.
  matcher: ["/(api|trpc)(.*)"],
};
