import { redirect } from "next/navigation";
import { connection } from "next/server";

import { YourPage } from "@/components/guestbook/your-page";
import { Paper, Scribble } from "@/components/scrapbook";
import { AuthUnavailableError, getSessionUser } from "@/lib/auth/server";
import { displayNameOf } from "@/lib/display-name";
import { pageMetadata } from "@/lib/metadata";

// A Member's own page, not something to find in a search engine.
export const metadata = pageMetadata({
  title: "Your guestbook page",
  description: "Your page in the guestbook of Taylor's Secret Garden: download your data, or delete your account.",
  path: "/guestbook",
  noindex: true,
});

/**
 * The signed-in Member's page in the guestbook: what Swiftter keeps about
 * them, as a download, and the way to delete their account. Visitors are sent
 * to sign in first, and come back here.
 */
export default async function GuestbookPage() {
  // Per request, never prerendered: it is someone's own page.
  await connection();
  let user;

  try {
    user = await getSessionUser();
  } catch (error) {
    if (!(error instanceof AuthUnavailableError)) throw error;
    user = undefined;
  }

  if (user === null) redirect(`/sign-in?redirect_url=${encodeURIComponent("/guestbook")}`);

  return (
    <Paper className="overflow-x-clip px-4 pt-10 pb-16 sm:px-8 md:pt-14 md:pb-24">
      <div className="mx-auto w-full max-w-[560px]">
        <header className="mb-9 text-center">
          <h1 className="font-hand text-ink text-[clamp(2.75rem,11vw,4rem)] leading-[0.95] font-bold">Your guestbook page</h1>
          <Scribble className="mx-auto mt-1 h-3.5 w-56" />
          {user && <p className="font-hand text-soft mt-3 text-[1.45rem] leading-tight">signed in as {displayNameOf(user)}</p>}
        </header>
        {user ? (
          <YourPage />
        ) : (
          <p className="text-ink text-center" role="alert">
            Signing in is unavailable just now, so your page can&apos;t be shown. Try again in a moment.
          </p>
        )}
      </div>
    </Paper>
  );
}
