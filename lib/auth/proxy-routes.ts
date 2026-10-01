/*
  The Neon Auth endpoints this site uses, by method: everything the browser
  sends to /api/auth. The proxy (app/api/auth/[...path]) forwards these and
  nothing else, so the rest of Neon Auth's API (updating or deleting a user,
  sessions, admin, organisations, tokens…) is not reachable through this
  origin, and no path can be spelled so that it reaches Neon Auth while
  missing the BotID check (lib/botid-routes.ts).

  Resetting a password and confirming an email address (#118, #82) add four:
  asking for a reset link and setting the new password with its token, asking
  for a verification code and entering it. The reset link in the email points
  at Neon Auth's own address, which sends the browser on to /reset-password
  with the token, so no GET reset-password/<token> passes through here (this
  proxy would drop its Location header anyway); and email addresses are
  confirmed by code, not link, so there is no GET verify-email either.
*/
export const AUTH_PROXY_ROUTES: Readonly<Record<string, readonly string[]>> = {
  GET: ["get-session"],
  POST: [
    "sign-up/email",
    "sign-in/email",
    "sign-in/social",
    "sign-out",
    "request-password-reset",
    "reset-password",
    "send-verification-email",
    "email-otp/verify-email",
  ],
};

/**
 * Whether the proxy may forward this request: its method and its path
 * segments (as the route receives them, decoded) must spell one of
 * AUTH_PROXY_ROUTES exactly. A segment that is `.` or `..`, or that contains a
 * slash, a backslash or a `%` (an encoded path, decoded into one segment),
 * never matches.
 */
export function isAuthProxyRoute(method: string, segments: readonly string[]): boolean {
  if (segments.some((segment) => segment === "." || segment === ".." || /[/\\%]/.test(segment))) return false;

  return (AUTH_PROXY_ROUTES[method.toUpperCase()] ?? []).includes(segments.join("/"));
}
