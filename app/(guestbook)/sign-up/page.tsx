import { Guestbook, guestbookError, guestbookRedirect, type SearchParams } from "@/components/guestbook/guestbook";
import { GuestbookForm } from "@/components/guestbook/guestbook-form";
import { pageMetadata } from "@/lib/metadata";

// A form, not something to find in a search engine.
export const metadata = pageMetadata({
  title: "Sign up",
  description: "Sign the guestbook of Taylor's Secret Garden: become a Member and pass notes on Swiftter, its fan feed.",
  path: "/sign-up",
  noindex: true,
});

// A new Member goes back where they were headed (a thread they wanted to reply
// to), through the same check as sign-in; else to Swiftter, to pass their first note.
export default async function SignUpPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <Guestbook note="New here? Leave your name, then pass a note on Swiftter.">
      <GuestbookForm initialError={guestbookError(params)} mode="sign-up" redirectTo={guestbookRedirect(params)} />
    </Guestbook>
  );
}
