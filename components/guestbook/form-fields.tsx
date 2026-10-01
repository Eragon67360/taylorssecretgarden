import type { AuthFailure } from "@/lib/auth/client";

import { type ReactNode, useSyncExternalStore } from "react";

import { BOT_REFUSAL } from "@/lib/botid-routes";

/*
  What every guestbook card shares: notebook-line fields, inline links, the
  error and the good-news notes, and the failures any Neon Auth request can
  meet (a bot check, a rate limit, no connection).
*/

const subscribeNothing = () => () => {};

/**
 * Whether React has taken over the page. Until then a form's submit button
 * stays disabled: a press would send the browser's own GET submission, with
 * the email address, or a password, in the page's address.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}

export const MIN_PASSWORD_LENGTH = 8;

export const TOO_MANY_TRIES = "Too many tries in a row. Wait a minute, then try again.";

export const inlineLinkClass = "text-accent hover:text-ink focus-ring rounded-sm font-bold underline underline-offset-[3px]";

export const inputClass =
  "text-ink placeholder:text-soft/70 focus-visible:outline-ink w-full rounded-none border-0 bg-[color-mix(in_srgb,var(--paper)_35%,var(--card))] px-2 py-2.5 text-[1rem] shadow-[inset_0_-2px_0_var(--soft)] transition-shadow outline-offset-[3px] hover:shadow-[inset_0_-2px_0_var(--ink)] focus:shadow-[inset_0_-2px_0_var(--ink)] focus-visible:outline-[2.5px] focus-visible:outline-solid aria-[invalid=true]:shadow-[inset_0_-2px_0_var(--pen)]";

/**
 * The failures that are about the request, not what was typed: BotID's
 * refusal (from app/api/auth/[...path]), Neon Auth's rate limit, no
 * connection. Null when the form should explain it itself.
 */
export function describeRequestFailure({ code = "", status }: AuthFailure): string | null {
  if (code.toLowerCase() === "bot_detected") return BOT_REFUSAL;
  if (code.toLowerCase() === "over_request_rate_limit" || status === 429) return TOO_MANY_TRIES;
  if (status === undefined || status === 0) return "The guestbook can't be reached right now. Check your connection and try again.";

  return null;
}

/** Whether a refusal is about what was typed (so the fields are marked), not a rate limit, BotID or an outage. */
export const isFieldRefusal = ({ status }: AuthFailure) => status >= 400 && status < 500 && status !== 429 && status !== 403;

export function Field({ id, label, hint, hintId, children }: { id: string; label: string; hint?: string; hintId?: string; children: ReactNode }) {
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

/** What went wrong, in red pen at the top of the form. */
export function FormError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p
      className="border-pen text-pen rounded-[0.25rem] border-l-4 bg-[color-mix(in_srgb,var(--pen)_8%,var(--card))] px-3 py-2 text-[0.95rem] font-semibold"
      id={id}
      role="alert"
    >
      {children}
    </p>
  );
}

/** Good news (a link sent, a password changed), in green ink; read out politely. */
export function FormNotice({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p
      className="text-ink rounded-[0.25rem] border-l-4 border-[var(--stem)] bg-[color-mix(in_srgb,var(--stem)_10%,var(--card))] px-3 py-2 text-[0.95rem] font-semibold"
      id={id}
      role="status"
    >
      {children}
    </p>
  );
}
