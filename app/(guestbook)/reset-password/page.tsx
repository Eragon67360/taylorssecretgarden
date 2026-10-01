import type { Metadata } from "next";

import { Guestbook, guestbookRedirect, type SearchParams } from "@/components/guestbook/guestbook";
import { ExpiredLink, ResetPasswordForm } from "@/components/guestbook/reset-password-form";
import { pageMetadata } from "@/lib/metadata";

// A form, not something to find in a search engine; and its address carries
// the reset token, which no other site should ever see in a Referer.
export const metadata: Metadata = {
  ...pageMetadata({
    title: "Choose a new password",
    description: "Choose a new password for your account on Taylor's Secret Garden.",
    path: "/reset-password",
    noindex: true,
  }),
  referrer: "no-referrer",
};

const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Where the reset link lands (#118). The email's link goes to Neon Auth, which
 * sends the browser here with `?token=…`, or with `?error=INVALID_TOKEN` when
 * the link has expired (after an hour) or was used already.
 */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const token = firstParam(params.token);
  const redirectTo = guestbookRedirect(params);

  return (
    <Guestbook note="A fresh page, and a new password.">
      {token && !firstParam(params.error) ? <ResetPasswordForm redirectTo={redirectTo} token={token} /> : <ExpiredLink redirectTo={redirectTo} />}
    </Guestbook>
  );
}
