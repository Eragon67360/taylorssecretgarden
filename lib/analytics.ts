import { track } from "@vercel/analytics";

/*
  Vercel Web Analytics (components/analytics.tsx): cookieless page views, and
  these few custom events, so the owner sees what the site is used for. No
  event carries anything about the Member: no name, email, id or note text.
*/
export type AnalyticsEvent =
  | { name: "Sign up" }
  | { name: "Sign in" }
  /** Leaving for Google; whether it ends signed in is not known here. */
  | { name: "Google sign-in started" }
  | { name: "Note passed"; reply: boolean }
  | { name: "Preview played" };

export function trackEvent({ name, ...properties }: AnalyticsEvent) {
  track(name, properties);
}

/**
 * Query parameters never sent with a page view: Neon Auth's one-time Google
 * verifier (a credential until it is exchanged), the guestbook's return
 * address, and its error codes.
 */
export const PRIVATE_QUERY_PARAMS = ["neon_auth_session_verifier", "redirect_url", "error"];

/** The page address as Analytics may record it: the private parameters removed. */
export function redactUrl(url: string): string {
  const parsed = new URL(url);

  for (const name of PRIVATE_QUERY_PARAMS) parsed.searchParams.delete(name);

  return parsed.toString();
}
