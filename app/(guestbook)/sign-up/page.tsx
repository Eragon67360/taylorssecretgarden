import type { Metadata } from "next";

import { Guestbook, guestbookError, type SearchParams } from "@/components/guestbook/guestbook";
import { GuestbookForm } from "@/components/guestbook/guestbook-form";

export const metadata: Metadata = {
  title: "Sign up",
};

// A new Member always starts on Swiftter, to pass their first note.
export default async function SignUpPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Guestbook note="New here? Leave your name, then pass a note on Swiftter.">
      <GuestbookForm initialError={guestbookError(await searchParams)} mode="sign-up" redirectTo="/swiftter" />
    </Guestbook>
  );
}
