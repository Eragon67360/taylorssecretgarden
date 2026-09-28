"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useRef, useState } from "react";

import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

type Mode = "sign-in" | "sign-up";

type GuestbookFormProps = {
  mode: Mode;
  /** Where to go once signed in: a path on this site. */
  redirectTo: string;
  /** An error to show straight away (e.g. Google sent the visitor back with one). */
  initialError?: string | null;
};

const COPY = {
  "sign-in": {
    title: "Sign in to Taylor's Secret Garden",
    subtitle: "Welcome back. Your pen is where you left it.",
    submit: "Sign in",
    pending: "Signing in…",
    switchText: "New here?",
    switchLink: { href: "/sign-up", label: "Sign up" },
  },
  "sign-up": {
    title: "Create your account",
    subtitle: "Your name goes in the guestbook, then on every note you pass.",
    submit: "Sign the guestbook",
    pending: "Signing…",
    switchText: "Already in the guestbook?",
    switchLink: { href: "/sign-in", label: "Sign in" },
  },
} as const;

export const MIN_PASSWORD_LENGTH = 8;

type AuthFailure = { code?: string; message?: string; status?: number };

/**
 * What went wrong, in the journal's voice. Neon Auth's client throws its
 * `AuthApiError` (codes like `invalid_credentials`) or returns Better Auth's
 * `{ error }` (codes like `INVALID_EMAIL_OR_PASSWORD`); both are read here.
 */
function describeError(failure: unknown): string {
  const { code = "", message = "", status } = (failure ?? {}) as AuthFailure;

  switch (code.toLowerCase()) {
    case "invalid_credentials":
    case "invalid_email_or_password":
    case "invalid_password":
    case "user_not_found":
      return "That email or password doesn't match anyone in the guestbook.";
    case "user_already_exists":
    case "user_already_exists_use_another_email":
      return "That email has already signed the guestbook. Sign in instead.";
    case "weak_password":
    case "password_too_short":
      return `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`;
    case "email_address_invalid":
    case "invalid_email":
      return "That doesn't look like an email address.";
    case "over_request_rate_limit":
      return "Too many tries in a row. Wait a minute, then try again.";
  }
  // Better Auth's "User already exists. Use another email." has no code of its own here.
  if (/already exists/i.test(message)) return "That email has already signed the guestbook. Sign in instead.";
  if (status === 429) return "Too many tries in a row. Wait a minute, then try again.";
  if (status === undefined || status === 0) return "The guestbook can't be reached right now. Check your connection and try again.";

  return "The guestbook couldn't be signed just now. Try again in a moment.";
}

const inputClass =
  "text-ink placeholder:text-soft/70 focus-visible:outline-ink w-full rounded-none border-0 bg-[color-mix(in_srgb,var(--paper)_35%,var(--card))] px-2 py-2.5 text-[1rem] shadow-[inset_0_-2px_0_var(--soft)] transition-shadow outline-offset-[3px] hover:shadow-[inset_0_-2px_0_var(--ink)] focus:shadow-[inset_0_-2px_0_var(--ink)] focus-visible:outline-[2.5px] focus-visible:outline-solid aria-[invalid=true]:shadow-[inset_0_-2px_0_var(--pen)]";

/**
 * The guestbook's own sign-in and sign-up forms, written on its card: a
 * handwritten title, "Continue with Google" on a paper slip, notebook-line
 * fields and an ink-stamp button. Talks to Neon Auth through /api/auth.
 */
export function GuestbookForm({ mode, redirectTo, initialError = null }: GuestbookFormProps) {
  const copy = COPY[mode];
  const router = useRouter();
  const id = useId();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(initialError);
  // Only a refused email or password marks the fields; a Google error does not.
  const [fieldsInvalid, setFieldsInvalid] = useState(false);
  const [pending, setPending] = useState<"email" | "google" | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setPending("email");
    setError(null);
    const { error: failure } = await (
      mode === "sign-up"
        ? authClient.signUp.email({ name: String(form.get("name") ?? "").trim(), email, password })
        : authClient.signIn.email({ email, password })
    ).catch((thrown: unknown) => ({ error: thrown }));

    if (failure) {
      const { status = 0 } = failure as AuthFailure;

      setError(describeError(failure));
      setFieldsInvalid(status >= 400 && status < 500 && status !== 429);
      setPending(null);
      // Try again from the password, typed afresh.
      if (passwordRef.current) passwordRef.current.value = "";
      passwordRef.current?.focus();

      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  const continueWithGoogle = async () => {
    setPending("google");
    setError(null);
    setFieldsInvalid(false);
    const here = window.location.origin;
    // On success the browser leaves for Google, and Neon Auth brings it back to callbackURL.
    const { error: failure } = await authClient.signIn
      .social({
        provider: "google",
        callbackURL: new URL(redirectTo, here).href,
        // Neon Auth adds `?error=…` (see guestbookError in components/guestbook/guestbook.tsx).
        errorCallbackURL: new URL(`/${mode}`, here).href,
      })
      .catch((thrown: unknown) => ({ error: thrown }));

    if (failure) {
      setError("Google sign-in didn't go through. Try again, or use your email.");
      setPending(null);
    }
  };

  const errorId = `${id}-error`;
  const hintId = `${id}-password-hint`;
  const describedBy = error ? errorId : undefined;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-hand text-ink text-[2rem] leading-[1.05] font-bold">{copy.title}</h2>
        <p className="text-soft text-[0.95rem]">{copy.subtitle}</p>
      </header>

      <button
        className="focus-ring text-ink bg-paper flex min-h-11 w-full items-center justify-center gap-3 rounded-[0.25rem] px-4 font-semibold shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--soft)_55%,var(--line)),0_2px_0_var(--line)] transition-colors hover:bg-[color-mix(in_srgb,var(--line)_45%,var(--paper))] disabled:opacity-60"
        disabled={pending !== null}
        type="button"
        onClick={continueWithGoogle}
      >
        <GoogleMark />
        {pending === "google" ? "Opening Google…" : "Continue with Google"}
      </button>

      <p aria-hidden="true" className="font-hand text-soft flex items-center gap-3 text-[1.2rem]">
        <span className="bg-line h-px flex-1" />
        or with your email
        <span className="bg-line h-px flex-1" />
      </p>

      <form aria-describedby={describedBy} className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {error && (
          <p
            className="border-pen text-pen rounded-[0.25rem] border-l-4 bg-[color-mix(in_srgb,var(--pen)_8%,var(--card))] px-3 py-2 text-[0.95rem] font-semibold"
            id={errorId}
            role="alert"
          >
            {error}
          </p>
        )}

        {mode === "sign-up" && (
          <Field id={`${id}-name`} label="Name">
            <input
              required
              autoComplete="name"
              className={inputClass}
              id={`${id}-name`}
              maxLength={80}
              name="name"
              type="text"
            />
          </Field>
        )}

        <Field id={`${id}-email`} label="Email">
          <input
            required
            aria-invalid={fieldsInvalid || undefined}
            autoComplete="email"
            className={inputClass}
            id={`${id}-email`}
            name="email"
            type="email"
          />
        </Field>

        <Field
          hint={mode === "sign-up" ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
          hintId={hintId}
          id={`${id}-password`}
          label="Password"
        >
          <input
            ref={passwordRef}
            required
            aria-describedby={mode === "sign-up" ? hintId : undefined}
            aria-invalid={fieldsInvalid || undefined}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            className={inputClass}
            id={`${id}-password`}
            minLength={mode === "sign-up" ? MIN_PASSWORD_LENGTH : undefined}
            name="password"
            type="password"
          />
        </Field>

        <button
          aria-busy={pending === "email"}
          className={cn(
            "bg-accent text-on-accent focus-ring mt-1 min-h-11 w-full rounded-[0.25rem] px-5 font-bold tracking-[0.02em]",
            "shadow-[2px_3px_0_color-mix(in_srgb,var(--ink)_30%,transparent)] transition-[background-color,translate] duration-200",
            "hover:bg-[color-mix(in_srgb,var(--accent)_88%,black)] disabled:opacity-70 motion-safe:active:translate-y-px",
          )}
          disabled={pending !== null}
          type="submit"
        >
          {pending === "email" ? copy.pending : copy.submit}
        </button>
      </form>

      <p className="border-line text-soft border-t border-dashed pt-4 text-[0.95rem]">
        {copy.switchText}{" "}
        <Link
          className="text-accent hover:text-ink focus-ring rounded-sm font-bold underline underline-offset-[3px]"
          href={copy.switchLink.href}
        >
          {copy.switchLink.label}
        </Link>
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  hintId,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  hintId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-ink font-bold" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-soft text-[0.875rem]" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** Google's "G", in its own colours, as Google's branding asks for sign-in buttons. */
function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 48 48">
      <path
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
        fill="#FFC107"
      />
      <path d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" fill="#FF3D00" />
      <path d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" fill="#4CAF50" />
      <path
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
        fill="#1976D2"
      />
    </svg>
  );
}
