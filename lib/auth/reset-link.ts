/*
  The password reset link in the journal's email (#167): Neon Auth sends
  <its base URL>/reset-password/<token>?callbackURL=<our /reset-password>,
  a neon.tech address that only checks the token and redirects to ours with
  `?token=`. An email from Taylor's Secret Garden that points at another domain
  reads like phishing, so the email carries our own address with the same
  token instead. An expired or used token is then reported when the new
  password is sent (reset-password answers INVALID_TOKEN), not on arrival.

  Only a link that is exactly Neon Auth's reset link, going back to one of the
  site's own addresses, is rewritten; anything else is kept as Neon Auth sent it.
*/

/** The addresses a reset may come back to (Neon Auth's trusted domains for production). */
const SITE_ORIGINS = new Set(["https://www.taylorssecretgarden.com", "https://taylorssecretgarden.com"]);

/** Better Auth's reset tokens: URL-safe characters only. */
const TOKEN = /^[A-Za-z0-9_-]{8,256}$/;

/** The reset link on the site's own domain, or the link unchanged when it is not Neon Auth's reset link back to this site. */
export function siteResetLink(linkUrl: string, neonAuthBaseUrl: string): string {
  let link: URL;
  let base: URL;
  let callback: URL;

  try {
    link = new URL(linkUrl);
    base = new URL(neonAuthBaseUrl);
    callback = new URL(link.searchParams.get("callbackURL") ?? "");
  } catch {
    return linkUrl;
  }

  const prefix = `${base.pathname.replace(/\/+$/, "")}/reset-password/`;

  if (link.origin !== base.origin || !link.pathname.startsWith(prefix)) return linkUrl;

  const token = link.pathname.slice(prefix.length);

  if (!TOKEN.test(token)) return linkUrl;
  if (!SITE_ORIGINS.has(callback.origin) || callback.pathname !== "/reset-password") return linkUrl;

  const own = new URL("/reset-password", callback.origin);

  own.searchParams.set("token", token);

  return own.toString();
}
