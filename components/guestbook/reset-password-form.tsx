"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useRef, useState } from "react";

import {
  describeRequestFailure,
  Field,
  FormError,
  inlineLinkClass,
  inputClass,
  isFieldRefusal,
  MIN_PASSWORD_LENGTH,
  useHydrated,
} from "@/components/guestbook/form-fields";
import { withRedirect } from "@/components/guestbook/guestbook";
import { Button } from "@/components/scrapbook";
import { type AuthFailure, resetPassword } from "@/lib/auth/client";

/** Better Auth's longest password. */
const MAX_PASSWORD_LENGTH = 128;

const isExpired = ({ code = "" }: AuthFailure) => code.toLowerCase() === "invalid_token";

function describeError(failure: AuthFailure): string {
  switch ((failure.code ?? "").toLowerCase()) {
    case "password_too_short":
      return `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`;
    case "password_too_long":
      return `Passwords can have at most ${MAX_PASSWORD_LENGTH} characters.`;
  }

  return describeRequestFailure(failure) ?? "Your password couldn't be changed just now. Try again in a moment.";
}

/**
 * Choosing a new password (#118), with the token Neon Auth's link brought
 * back. The same rule as signing up (at least 8 characters), typed twice.
 * Neon Auth opens no session with it: the Member then signs in, on the sign-in
 * page, which says the password was changed.
 */
export function ResetPasswordForm({ token, redirectTo }: { token: string; redirectTo: string }) {
  const router = useRouter();
  const id = useId();
  const hydrated = useHydrated();
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState(false);

  // The browser's own message, in the journal's words, while the two differ.
  const checkMatch = () => {
    const confirm = confirmRef.current;

    confirm?.setCustomValidity(confirm.value && confirm.value !== passwordRef.current?.value ? "The two passwords don't match." : "");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newPassword = String(new FormData(event.currentTarget).get("password") ?? "");

    setPending(true);
    setError(null);
    const { error: failure } = await resetPassword({ newPassword, token });

    if (failure) {
      setPending(false);
      if (isExpired(failure)) return setExpired(true);
      setError(describeError(failure));
      setInvalid(isFieldRefusal(failure));
      passwordRef.current?.focus();

      return;
    }
    router.push(withRedirect("/sign-in", redirectTo, { notice: "password-reset" }));
  };

  if (expired) return <ExpiredLink redirectTo={redirectTo} />;

  const errorId = `${id}-error`;
  const hintId = `${id}-password-hint`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-hand text-ink text-[2rem] leading-[1.05] font-bold">Choose a new password</h2>
        <p className="text-soft text-[0.95rem]">Then sign in with it. The old one stops working.</p>
      </header>

      <form aria-describedby={error ? errorId : undefined} className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {error && <FormError id={errorId}>{error}</FormError>}

        <Field hint={`At least ${MIN_PASSWORD_LENGTH} characters.`} hintId={hintId} id={`${id}-password`} label="New password">
          <input
            ref={passwordRef}
            required
            aria-describedby={hintId}
            aria-invalid={invalid || undefined}
            autoComplete="new-password"
            className={inputClass}
            id={`${id}-password`}
            maxLength={MAX_PASSWORD_LENGTH}
            minLength={MIN_PASSWORD_LENGTH}
            name="password"
            type="password"
            onInput={checkMatch}
          />
        </Field>

        <Field id={`${id}-confirm`} label="New password, again">
          <input
            ref={confirmRef}
            required
            autoComplete="new-password"
            className={inputClass}
            id={`${id}-confirm`}
            maxLength={MAX_PASSWORD_LENGTH}
            name="confirm"
            type="password"
            onInput={checkMatch}
          />
        </Field>

        <Button
          aria-busy={pending}
          className="mt-1 w-full text-[16px] shadow-[2px_3px_0_color-mix(in_srgb,var(--ink)_30%,transparent)]"
          disabled={!hydrated || pending}
          type="submit"
        >
          {pending ? "Saving…" : "Save my new password"}
        </Button>
      </form>
    </div>
  );
}

/** A link that has expired, been used, or lost its token: say so, and offer a new one. */
export function ExpiredLink({ redirectTo }: { redirectTo: string }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-hand text-ink text-[2rem] leading-[1.05] font-bold">This link has expired</h2>
      <p className="text-ink text-[0.95rem]" role="alert">
        Reset links work once, for an hour. This one has been used or is too old, or it was cut short when it was copied.
      </p>
      <p className="text-[0.95rem]">
        <Link className={inlineLinkClass} href={withRedirect("/forgot-password", redirectTo)}>
          Send me a new link
        </Link>
      </p>
    </div>
  );
}
