import type { Metadata } from "next";

import { SignIn } from "@clerk/nextjs";

import { guestbookAppearance } from "@/components/guestbook/appearance";
import { Guestbook } from "@/components/guestbook/guestbook";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <Guestbook note="Been here before? Write your name again.">
      <SignIn appearance={guestbookAppearance} />
    </Guestbook>
  );
}
