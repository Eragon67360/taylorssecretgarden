import type { ReactNode } from "react";

import { Paper, PressedFlower, Scribble, WashiTape } from "@/components/scrapbook";
import { safeRedirect } from "@/lib/safe-redirect";

type GuestbookProps = {
  /** A handwritten line under the heading. */
  note: string;
  /** The sign-in or sign-up form (components/guestbook/guestbook-form.tsx). */
  children: ReactNode;
};

export type SearchParams = Record<string, string | string[] | undefined>;

const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Shown when a Google sign-in comes back with an error, or cannot start. */
export const GOOGLE_ERROR = "Google sign-in didn't go through. Try again, or use your email.";

/** Where signing in or up goes when nothing asked for somewhere else: Swiftter, to pass a note. */
export const DEFAULT_REDIRECT = "/swiftter";

/**
 * Where to go once signed in or up: `redirect_url` when it is a path on this
 * site (never another origin), else Swiftter.
 */
export function guestbookRedirect(params: SearchParams): string {
  return safeRedirect(firstParam(params.redirect_url), DEFAULT_REDIRECT);
}

/**
 * Another guestbook page, still headed for the same place: a visitor who came
 * to reply to a thread and has no account yet goes back to the thread once
 * signed up (or once their password is reset). Swiftter, where every page
 * goes by default, needs no mention. `extra` adds to the query (a notice).
 */
export function withRedirect(path: string, redirectTo: string, extra: Record<string, string> = {}) {
  const query = new URLSearchParams(extra);

  if (redirectTo !== DEFAULT_REDIRECT) query.set("redirect_url", redirectTo);

  return query.size ? `${path}?${query}` : path;
}

/** The good news a page was sent with (`?notice=…`), to show above its form. */
const NOTICES = {
  "password-reset": "Your password is changed. Sign in with the new one.",
  "email-confirmed": "Your email address is confirmed. Sign in to carry on.",
} as const;

export type GuestbookNotice = keyof typeof NOTICES;

/** The notice for `?notice=…`, or null; only the known ones, never text from the address. */
export function guestbookNotice(params: SearchParams): string | null {
  const notice = firstParam(params.notice);

  return notice && Object.hasOwn(NOTICES, notice) ? NOTICES[notice as GuestbookNotice] : null;
}

/** The explanation to show when Google sent the visitor back with `?error=…`. */
export function guestbookError(params: SearchParams): string | null {
  return firstParam(params.error) ? GOOGLE_ERROR : null;
}

/**
 * The guestbook spread shared by sign-in and sign-up: a handwritten "Sign the
 * guestbook" heading on the journal's paper, and a taped card on a kraft page,
 * pressed flowers tucked under its corners, holding the form.
 */
export function Guestbook({ note, children }: GuestbookProps) {
  return (
    <Paper className="overflow-x-clip px-4 pt-10 pb-16 sm:px-8 md:pt-14 md:pb-24">
      <div className="mx-auto w-full max-w-[440px]">
        <header className="relative mb-9 text-center">
          <h1 className="font-hand text-ink text-[clamp(3rem,12vw,4.25rem)] leading-[0.95] font-bold">Sign the guestbook</h1>
          <Scribble className="mx-auto mt-1 h-3.5 w-56" />
          <p className="font-hand text-soft mt-3 text-[1.45rem] leading-tight">{note}</p>
        </header>

        <div className="relative">
          <PressedFlower className="absolute -top-16 -left-16 hidden h-44 w-28 -rotate-[28deg] sm:block" kind="daisy" />
          <PressedFlower className="absolute -right-12 -bottom-10 hidden h-40 w-24 rotate-[18deg] md:block" color="var(--stem)" kind="fern" />
          {/* The page underneath, peeking out at an angle. */}
          <Paper aria-hidden="true" className="absolute inset-0 rotate-[2.2deg] shadow-[0_8px_18px_-8px_rgba(60,40,20,.3)]" tone="kraft" />
          <Paper className="relative px-5 pt-9 pb-6 shadow-[0_1px_2px_rgba(60,40,20,.12),0_14px_28px_-10px_rgba(60,40,20,.35)] sm:px-8" tone="card">
            <WashiTape className="-top-3 left-1/2 -ml-14" rotate={-3} width={112} />
            {children}
          </Paper>
        </div>
      </div>
    </Paper>
  );
}
