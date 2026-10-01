import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ModerationDesk } from "@/components/moderation/moderation-desk";
import { Paper, Scribble } from "@/components/scrapbook";
import { AuthUnavailableError, getSessionUser } from "@/lib/auth/server";
import { pageMetadata } from "@/lib/metadata";
import { isModerator, listModerationQueue } from "@/service/moderators";

// For moderators only: never in a search engine.
export const metadata = pageMetadata({
  title: "Moderation",
  description: "Reports and appeals on Swiftter, for its moderators.",
  path: "/guestbook/moderation",
  noindex: true,
});

/**
 * The moderators' page (#166): every note Members asked a human about, open
 * reports and appeals, with what is needed to decide (the text, held notes'
 * too, the author, the reasons, the model's decision) and the decision itself
 * in two taps: tear up, keep, or publish a refused note after all.
 *
 * Anyone else gets this site's 404, signed in or not: the page does not say
 * it exists. The role is checked here, on the server, and again by every
 * route and service function behind the page.
 */
export default async function ModerationPage() {
  // Per request, never prerendered: who may see it is decided for each visit.
  await connection();
  let user;

  try {
    user = await getSessionUser();
  } catch (error) {
    if (!(error instanceof AuthUnavailableError)) throw error;
    user = undefined;
  }

  if (user === null || (user && !(await isModerator(user.id)))) notFound();

  return (
    <Paper className="overflow-x-clip px-4 pt-10 pb-16 sm:px-8 md:pt-14 md:pb-24">
      <div className="mx-auto w-full max-w-[640px]">
        <header className="mb-8 text-center">
          <h1 className="font-hand text-ink text-[clamp(2.75rem,11vw,4rem)] leading-[0.95] font-bold">Moderation</h1>
          <Scribble className="mx-auto mt-1 h-3.5 w-48" />
          <p className="text-soft mx-auto mt-3 max-w-[46ch] text-[15.5px] leading-relaxed">
            Notes Members reported, and refused notes whose authors asked a human to look again. Each decision is recorded as yours.
          </p>
        </header>
        {user ? (
          <ModerationDesk initial={await listModerationQueue(user.id)} />
        ) : (
          <p className="text-ink text-center" role="alert">
            Signing in is unavailable just now, so this page can&apos;t be shown. Try again in a moment.
          </p>
        )}
      </div>
    </Paper>
  );
}
