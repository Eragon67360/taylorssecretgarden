import { redirect } from "next/navigation";
import { connection } from "next/server";

import { ConfirmYourEmail } from "@/components/guestbook/confirm-your-email";
import { YourNotes } from "@/components/guestbook/your-notes";
import { YourPage } from "@/components/guestbook/your-page";
import { Paper, Scribble } from "@/components/scrapbook";
import { isEmailVerificationRequired } from "@/lib/auth/email-verification";
import { AuthUnavailableError, getSessionUser } from "@/lib/auth/server";
import { displayNameOf } from "@/lib/display-name";
import { pageMetadata } from "@/lib/metadata";
import { listOwnNotes } from "@/service/members";

// A Member's own page, not something to find in a search engine.
export const metadata = pageMetadata({
  title: "Your guestbook page",
  description: "Your page in the guestbook of Taylor's Secret Garden: your notes, your data, or deleting your account.",
  path: "/guestbook",
  noindex: true,
});

/** The Member's published notes, or null when the database cannot be read (the rest of the page still works). */
async function readOwnNotes(memberId: string) {
  try {
    return await listOwnNotes(memberId);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Reading your notes for /guestbook failed", error instanceof Error ? error.message : error);

    return null;
  }
}

/**
 * The signed-in Member's page in the guestbook: the notes they published on
 * Swiftter, what Swiftter keeps about them, as a download, and the way to
 * delete their account. Visitors are sent to sign in first, and come back here.
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
          <div className="flex flex-col gap-8">
            {/* Google sign-ins arrive confirmed; Members who signed up with a password before #82 may not be. */}
            {!user.emailVerified && <ConfirmYourEmail email={user.email} required={isEmailVerificationRequired()} />}
            <YourNotes memberId={user.id} notes={await readOwnNotes(user.id)} />
            <YourPage />
          </div>
        ) : (
          <p className="text-ink text-center" role="alert">
            Signing in is unavailable just now, so your page can&apos;t be shown. Try again in a moment.
          </p>
        )}
      </div>
    </Paper>
  );
}
