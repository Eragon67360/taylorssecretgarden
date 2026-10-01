"use client";

import Link from "next/link";
import { type FormEvent, useId, useState } from "react";

import { describeRequestFailure, Field, FormError, FormNotice, inlineLinkClass, inputClass, useHydrated } from "@/components/guestbook/form-fields";
import { withRedirect } from "@/components/guestbook/guestbook";
import { Button } from "@/components/scrapbook";
import { requestPasswordReset } from "@/lib/auth/client";

/**
 * The same answer for every address, so the form never tells who has an
 * account. Neon Auth answers alike too, and keeps a reset link for an hour.
 */
export const RESET_LINK_SENT =
  "If an account uses that address, we've emailed it a link to choose a new password. The link works for an hour; not there? Look in your spam folder.";

/**
 * "Forgot your password?" (#118): asks Neon Auth to email a reset link that
 * comes back to /reset-password (an absolute address on this site, which Neon
 * Auth checks against its trusted domains), still headed for `redirectTo`.
 */
export function ForgotPasswordForm({ redirectTo }: { redirectTo: string }) {
  const id = useId();
  const hydrated = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();

    setPending(true);
    setError(null);
    const { error: failure } = await requestPasswordReset({
      email,
      redirectTo: new URL(withRedirect("/reset-password", redirectTo), window.location.origin).href,
    });

    setPending(false);
    // Only a failure that says nothing about the account is shown: a bot check, a rate limit, no connection, an outage.
    if (failure) return setError(describeRequestFailure(failure) ?? "No link could be sent just now. Try again in a moment.");
    setSent(true);
  };

  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-hand text-ink text-[2rem] leading-[1.05] font-bold">Forgot your password?</h2>
        <p className="text-soft text-[0.95rem]">It happens. Give the email you signed with, and we&apos;ll send a link to choose a new one.</p>
      </header>

      {sent ? (
        <div className="flex flex-col gap-4">
          <FormNotice>{RESET_LINK_SENT}</FormNotice>
          <p className="text-soft text-[0.95rem]">
            Wrong address?{" "}
            <Button className="min-h-11 align-baseline" variant="text" onClick={() => setSent(false)}>
              Try another one
            </Button>
          </p>
        </div>
      ) : (
        <form aria-describedby={error ? errorId : undefined} className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {error && <FormError id={errorId}>{error}</FormError>}
          <Field id={`${id}-email`} label="Email">
            <input required autoComplete="email" className={inputClass} id={`${id}-email`} name="email" type="email" />
          </Field>
          <Button
            aria-busy={pending}
            className="mt-1 w-full text-[16px] shadow-[2px_3px_0_color-mix(in_srgb,var(--ink)_30%,transparent)]"
            disabled={!hydrated || pending}
            type="submit"
          >
            {pending ? "Sending…" : "Send me a link"}
          </Button>
        </form>
      )}

      <p className="border-line text-soft border-t border-dashed pt-4 text-[0.95rem]">
        Remembered it?{" "}
        <Link className={inlineLinkClass} href={withRedirect("/sign-in", redirectTo)}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
