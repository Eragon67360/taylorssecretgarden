/*
  Who is signed in on this page, asked once. Every part of a page that wants
  to know (the header's member menu, Swiftter's composer) shares one
  get-session request, and sign-in, sign-up and sign-out update the answer in
  place, so it stays right without asking again. No dependencies: visitors,
  most of the site's readers, pay for one small request and nothing more.
*/

/** The query parameter a Google sign-in comes back with; the session request completes the sign-in. */
const SESSION_VERIFIER_PARAM = "neon_auth_session_verifier";

/** The signed-in Member, as Neon Auth's session reports them. */
export type MemberUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

// `undefined` until the session has been asked about (or a sign-in answered first).
let member: MemberUser | null | undefined;
let request: Promise<MemberUser | null> | undefined;
const memberListeners = new Set<() => void>();

/** Records who is signed in (after signing in, up or out) and tells everyone listening. */
export function setSessionMember(user: MemberUser | null) {
  member = user;
  request = Promise.resolve(user);
  memberListeners.forEach((listener) => listener());
}

/** For useSyncExternalStore: who is signed in, `undefined` while nobody knows yet. */
export const currentMember = () => member;

/** For useSyncExternalStore: called whenever who is signed in changes. */
export function subscribeMember(listener: () => void) {
  memberListeners.add(listener);

  return () => {
    memberListeners.delete(listener);
  };
}

/**
 * The signed-in Member, or null for a visitor: one get-session request per
 * page, however many ask. A Google sign-in coming back (its verifier in the
 * URL) is completed by this request: the verifier goes along, the session
 * cookie comes back, and the verifier leaves the address bar. A request that
 * fails answers null but is not remembered, so the next ask tries again.
 * Browser only.
 */
export function getSessionMember(): Promise<MemberUser | null> {
  if (request) return request;

  // A sign-in or sign-out finishing while this is in flight is newer than its answer, and wins.
  const pending: Promise<MemberUser | null> = fetchSessionMember().then(
    (user) => {
      if (request !== pending) return member ?? null;
      setSessionMember(user);

      return user;
    },
    () => {
      if (request !== pending) return member ?? null;
      request = undefined;
      if (member === undefined) {
        member = null;
        memberListeners.forEach((listener) => listener());
      }

      return null;
    },
  );

  request = pending;

  return pending;
}

async function fetchSessionMember(): Promise<MemberUser | null> {
  const here = new URL(window.location.href);
  const verifier = here.searchParams.get(SESSION_VERIFIER_PARAM);
  const url = verifier ? `/api/auth/get-session?${new URLSearchParams({ [SESSION_VERIFIER_PARAM]: verifier })}` : "/api/auth/get-session";
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) throw new Error(`get-session answered ${response.status}`);
  const session = (await response.json()) as { user?: MemberUser | null } | null;
  const user = session?.user ?? null;

  // Signed in: the verifier has done its job, and should not be bookmarked or shared.
  if (verifier && user) {
    here.searchParams.delete(SESSION_VERIFIER_PARAM);
    history.replaceState(history.state, "", here.href);
  }

  return user;
}

/** Whether someone is signed in on this visit (the same single request as getSessionMember). Browser only. */
export async function mayBeMember(): Promise<boolean> {
  return Boolean(await getSessionMember());
}

/*
  Kept for anything still importing them: the header used to wait for Neon
  Auth's client to load before showing sign-out. There is no such client any
  more (lib/auth/client.ts is a few fetches); subscribeMember replaces this.
*/
let clientLoaded = false;
const listeners = new Set<() => void>();

/** No longer needed: signing in updates the header through setSessionMember. */
export function markAuthClientLoaded() {
  if (clientLoaded) return;
  clientLoaded = true;
  listeners.forEach((listener) => listener());
}

/** For useSyncExternalStore: whether markAuthClientLoaded has been called on this page. */
export function subscribeAuthClientLoaded(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export const isAuthClientLoaded = () => clientLoaded;
