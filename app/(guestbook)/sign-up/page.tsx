import { Guestbook, guestbookError, type SearchParams } from "@/components/guestbook/guestbook";
import { GuestbookForm } from "@/components/guestbook/guestbook-form";
import { pageMetadata } from "@/lib/metadata";

// A form, not something to find in a search engine.
export const metadata = pageMetadata({
  title: "Sign up",
  description: "Sign the guestbook of Taylor's Secret Garden: become a Member and pass notes on Swiftter, its fan feed.",
  path: "/sign-up",
  noindex: true,
});

// A new Member always starts on Swiftter, to pass their first note.
export default async function SignUpPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Guestbook note="New here? Leave your name, then pass a note on Swiftter.">
      <GuestbookForm initialError={guestbookError(await searchParams)} mode="sign-up" redirectTo="/swiftter" />
    </Guestbook>
  );
}
