import type { Metadata } from "next";

import { SignUp } from "@clerk/nextjs";

import { guestbookAppearance } from "@/components/guestbook/appearance";
import { Guestbook } from "@/components/guestbook/guestbook";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignUpPage() {
  return (
    <Guestbook note="New here? Leave your name, then pass a note on Swiftter.">
      <SignUp appearance={guestbookAppearance} forceRedirectUrl="/swiftter" />
    </Guestbook>
  );
}
