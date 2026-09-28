import type { Metadata } from "next";

import { Guestbook, guestbookError, guestbookRedirect, type SearchParams } from "@/components/guestbook/guestbook";
import { GuestbookForm } from "@/components/guestbook/guestbook-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <Guestbook note="Been here before? Write your name again.">
      <GuestbookForm initialError={guestbookError(params)} mode="sign-in" redirectTo={guestbookRedirect(params)} />
    </Guestbook>
  );
}
