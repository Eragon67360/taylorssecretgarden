/*
  Member avatars: which picture addresses the site shows. next/image only
  optimises the remote patterns in next.config.ts and throws on any other
  host, so an avatar is kept (when a Member is stored) and shown (when a note
  is drawn) only if it matches one of these; otherwise the Member gets their
  initials. Pure and without path aliases: next.config.ts imports it.
*/

/**
 * Google account photos (Neon Auth's Google sign-in):
 * lh3.googleusercontent.com/a/… and, for older accounts, /a-/…. Other lh3
 * paths hold any Google-hosted picture, so they stay out.
 */
export const AVATAR_REMOTE_PATTERNS = [
  { protocol: "https", hostname: "lh3.googleusercontent.com", port: "", pathname: "/a/**" },
  { protocol: "https", hostname: "lh3.googleusercontent.com", port: "", pathname: "/a-/**" },
] as const;

/** The avatar URL if next/image may load it (one of AVATAR_REMOTE_PATTERNS), else null. */
export function allowedAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const allowed = AVATAR_REMOTE_PATTERNS.some(
    ({ protocol, hostname, port, pathname }) =>
      parsed.protocol === `${protocol}:` &&
      parsed.hostname === hostname &&
      parsed.port === port &&
      !parsed.username &&
      !parsed.password &&
      parsed.pathname.startsWith(pathname.slice(0, -2)) &&
      parsed.pathname.length > pathname.length - 2,
  );

  return allowed ? url : null;
}
