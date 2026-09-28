/*
  Whether a page needs Neon Auth's client at all. The client (~100 KB of
  JavaScript) is only worth downloading for a Member: visitors, most of the
  site's readers, never load it. This module has no dependencies, so asking
  costs one small request instead.
*/

/** The query parameter a Google sign-in comes back with; the client's session request completes the sign-in. */
const SESSION_VERIFIER_PARAM = "neon_auth_session_verifier";

let clientLoaded = false;
const listeners = new Set<() => void>();

/** Called by lib/auth/client.ts once the client exists on this page (a sign-in form, Swiftter's composer). */
export function markAuthClientLoaded() {
  if (clientLoaded) return;
  clientLoaded = true;
  listeners.forEach((listener) => listener());
}

/** For useSyncExternalStore: whether the client has been loaded on this page. */
export function subscribeAuthClientLoaded(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export const isAuthClientLoaded = () => clientLoaded;

/**
 * Whether someone may be signed in on this visit: the client is already here,
 * a Google sign-in is coming back, or the session route knows the visitor's
 * cookie (it answers `null` for visitors). Browser only.
 */
export async function mayBeMember(): Promise<boolean> {
  if (clientLoaded || new URLSearchParams(window.location.search).has(SESSION_VERIFIER_PARAM)) return true;

  try {
    const response = await fetch("/api/auth/get-session", { cache: "no-store" });

    if (!response.ok) return false;
    const session = (await response.json()) as { user?: unknown } | null;

    return Boolean(session?.user);
  } catch {
    return false;
  }
}
