import { Guestbook, guestbookError, guestbookRedirect, type SearchParams } from "@/components/guestbook/guestbook";
import { GuestbookForm } from "@/components/guestbook/guestbook-form";
import { pageMetadata } from "@/lib/metadata";

// A form, not something to find in a search engine.
export const metadata = pageMetadata({
  title: "Sign in",
  description: "Sign in to Taylor's Secret Garden to pass notes on Swiftter, its fan feed.",
  path: "/sign-in",
  noindex: true,
});

export default async function SignInPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <Guestbook note="Been here before? Write your name again.">
      <GuestbookForm initialError={guestbookError(params)} mode="sign-in" redirectTo={guestbookRedirect(params)} />
    </Guestbook>
  );
}
