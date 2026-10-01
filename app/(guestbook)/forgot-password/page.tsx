import { ForgotPasswordForm } from "@/components/guestbook/forgot-password-form";
import { Guestbook, guestbookRedirect, type SearchParams } from "@/components/guestbook/guestbook";
import { pageMetadata } from "@/lib/metadata";

// A form, not something to find in a search engine.
export const metadata = pageMetadata({
  title: "Forgot your password?",
  description: "Choose a new password for your account on Taylor's Secret Garden: we email you a link.",
  path: "/forgot-password",
  noindex: true,
});

// Still headed where the Member was going when they went to sign in.
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Guestbook note="Lost your pen? We'll lend you another.">
      <ForgotPasswordForm redirectTo={guestbookRedirect(await searchParams)} />
    </Guestbook>
  );
}
