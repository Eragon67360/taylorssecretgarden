"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { describeRequestFailure, Field, FormError, FormNotice, inputClass, isFieldRefusal } from "@/components/guestbook/form-fields";
import { Button } from "@/components/scrapbook";
import { type AuthFailure, sendVerificationCode, verifyEmailCode } from "@/lib/auth/client";

/** How long "Send a new code" rests after a code was sent, so an impatient double tap does not send two. */
const RESEND_PAUSE_SECONDS = 30;

/**
 * Where the Member is: just signed up (Neon Auth has sent a code), refused at
 * sign-in (Neon Auth sends one if its "send on sign-in" setting is on, so the
 * field is there with a new code a tap away), or on their guestbook page
 * (nothing sent yet: the first code is asked for here).
 */
type Moment = "signed-up" | "sign-in" | "account";

type ConfirmEmailProps = {
  /** The address to confirm. */
  email: string;
  moment: Moment;
  /** Once confirmed; `signedIn` says whether Neon Auth opened a session with it. */
  onConfirmed: (signedIn: boolean) => void;
};

function describeCodeError(failure: AuthFailure): string {
  switch ((failure.code ?? "").toLowerCase()) {
    case "invalid_otp":
      return "That code doesn't match. Check the latest email and type it again.";
    case "otp_expired":
      return "That code has expired. Ask for a new one below.";
    case "too_many_attempts":
      return "Too many wrong tries for that code. Ask for a new one below.";
  }

  return describeRequestFailure(failure) ?? "The code couldn't be checked just now. Try again in a moment.";
}

/**
 * Confirming an email address with the code Neon Auth emails (#82): the code
 * field, and "Send a new code" (BotID-guarded, and resting for a moment after
 * each send). Neon Auth answers a right code by opening a session. On a
 * guestbook card it carries its own heading; on the guestbook page, the
 * section around it has one.
 */
export function ConfirmEmail({ email, moment, onConfirmed }: ConfirmEmailProps) {
  const id = useId();
  const codeRef = useRef<HTMLInputElement>(null);
  const [sent, setSent] = useState(moment !== "account");
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [notice, setNotice] = useState<string | null>(moment === "signed-up" ? `We've sent a code to ${email}.` : null);
  const [pending, setPending] = useState<"verify" | "send" | null>(null);
  const [pause, setPause] = useState(moment === "signed-up" ? RESEND_PAUSE_SECONDS : 0);
  // Moves to the code field once a code has been asked for here.
  const [focusCode, setFocusCode] = useState(false);

  useEffect(() => {
    if (pause <= 0) return;
    const timer = setTimeout(() => setPause((seconds) => seconds - 1), 1000);

    return () => clearTimeout(timer);
  }, [pause]);

  useEffect(() => {
    if (focusCode) codeRef.current?.focus();
  }, [focusCode]);

  const send = async () => {
    setPending("send");
    setError(null);
    setNotice(null);
    const { error: failure } = await sendVerificationCode({ email });

    setPending(null);
    // Already confirmed (in another tab, say): nothing left to do.
    if (failure?.code?.toLowerCase() === "email_already_verified") return onConfirmed(false);
    if (failure) return setError(describeRequestFailure(failure) ?? "No code could be sent just now. Try again in a moment.");
    setSent(true);
    setPause(RESEND_PAUSE_SECONDS);
    setNotice(`We've sent a code to ${email}. It works for a few minutes.`);
    setFocusCode(true);
  };

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const otp = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s+/g, "");

    setPending("verify");
    setError(null);
    setNotice(null);
    const { data, error: failure } = await verifyEmailCode({ email, otp });

    if (failure) {
      setPending(null);
      setError(describeCodeError(failure));
      setInvalid(isFieldRefusal(failure));
      codeRef.current?.select();

      return;
    }
    onConfirmed(data.token !== null && Boolean(data.user));
  };

  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const address = <strong className="text-ink break-all">{email}</strong>;

  return (
    <div className="flex flex-col gap-5">
      {moment !== "account" && (
        <header className="flex flex-col gap-1">
          <h2 className="font-hand text-ink text-[2rem] leading-[1.05] font-bold">Check your email</h2>
          <p className="text-soft text-[0.95rem]">
            {moment === "signed-up" ? (
              <>To finish signing the guestbook, type the code we emailed to {address}. It shows the address is yours.</>
            ) : (
              <>Your email address isn&apos;t confirmed yet. Type the code we emailed to {address}, or ask for a new one.</>
            )}
          </p>
        </header>
      )}

      {notice && <FormNotice>{notice}</FormNotice>}
      {error && <FormError id={errorId}>{error}</FormError>}

      {sent && (
        <form className="flex flex-col gap-5" onSubmit={verify}>
          <Field hint="It's in the email we sent. Not there? Look in your spam folder." hintId={hintId} id={`${id}-code`} label="Code">
            <input
              ref={codeRef}
              required
              aria-describedby={error ? `${hintId} ${errorId}` : hintId}
              aria-invalid={invalid || undefined}
              autoComplete="one-time-code"
              className={`${inputClass} font-mono tracking-[0.3em]`}
              id={`${id}-code`}
              inputMode="numeric"
              maxLength={12}
              name="code"
              type="text"
            />
          </Field>
          <Button aria-busy={pending === "verify"} className="w-full text-[16px]" disabled={pending !== null} type="submit">
            {pending === "verify" ? "Checking…" : "Confirm my email"}
          </Button>
        </form>
      )}

      {sent ? (
        <p className="text-soft text-[0.95rem]">
          No email, or the code has expired?{" "}
          <Button aria-busy={pending === "send"} className="min-h-11 align-baseline" disabled={pending !== null || pause > 0} variant="text" onClick={send}>
            {pending === "send" ? "Sending…" : pause > 0 ? `Send a new code (in ${pause}s)` : "Send a new code"}
          </Button>
        </p>
      ) : (
        <Button aria-busy={pending === "send"} className="self-start" disabled={pending !== null} onClick={send}>
          {pending === "send" ? "Sending…" : "Send me a code"}
        </Button>
      )}
    </div>
  );
}
