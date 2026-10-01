import { type MemberUser, setSessionMember } from "./member-hint";

/*
  Neon Auth in the browser: signing up, signing in (email or Google), signing
  out, resetting a password and confirming an email address, as plain
  requests to this origin's /api/auth
  (docs/adr/0004-neon-auth-replaces-clerk.md). These, and the session request
  in lib/auth/member-hint.ts, are every endpoint the proxy forwards
  (lib/auth/proxy-routes.ts), so the SDK's browser client (about 100 KB) has
  nothing left to do here.

  BotID's client (instrumentation-client.ts) wraps the global `fetch` and
  attaches its token to sign-up, sign-in and the requests that send an email,
  so these call `fetch` itself,
  looked up at call time.
*/

/** What a refused request said: Neon Auth's (or our proxy's) `code` and `message`, and the HTTP status (0 when unreachable). */
export type AuthFailure = { code?: string; message?: string; status: number };

export type AuthResult<T> = { data: T; error: null } | { data: null; error: AuthFailure };

async function post<T>(path: string, body: Record<string, unknown>): Promise<AuthResult<T>> {
  let response: Response;

  try {
    response = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { data: null, error: { status: 0 } };
  }

  const data = (await response.json().catch(() => null)) as (T & { code?: unknown; message?: unknown }) | null;

  if (!response.ok) {
    return {
      data: null,
      error: {
        status: response.status,
        code: typeof data?.code === "string" ? data.code : undefined,
        message: typeof data?.message === "string" ? data.message : undefined,
      },
    };
  }

  return { data: data as T, error: null };
}

/** A session's token comes back as `null` when no session was opened (the email address must be confirmed first). */
type SessionAnswer = { token?: string | null; user?: MemberUser | null };

/** Whether an answer opened a session: a sign-up that must confirm its email first answers `token: null`. */
const signedIn = (answer: SessionAnswer) => answer.token !== null && Boolean(answer.user);

/**
 * Signs a new Member up with email and password: signed in once it answers,
 * unless Neon Auth requires the email address to be confirmed first; then
 * `data.token` is null, nobody is signed in, and a code is on its way.
 */
export async function signUpEmail(input: { name: string; email: string; password: string }) {
  const result = await post<SessionAnswer>("sign-up/email", input);

  if (result.data) setSessionMember(signedIn(result.data) ? (result.data.user ?? null) : null);

  return result;
}

/** Signs a Member in with email and password. */
export async function signInEmail(input: { email: string; password: string }) {
  const result = await post<SessionAnswer>("sign-in/email", input);

  if (result.data) setSessionMember(result.data.user ?? null);

  return result;
}

/**
 * Starts a Google sign-in: Neon Auth answers with Google's address and the
 * browser leaves for it. Google sends the Member back to `callbackURL` with a
 * verifier in the query, which that page's session request exchanges for the
 * session (getSessionMember in lib/auth/member-hint.ts); a failure comes back
 * to `errorCallbackURL` with `?error=…`.
 */
export async function signInSocial(input: { provider: "google"; callbackURL: string; errorCallbackURL: string }) {
  const result = await post<{ url?: string; redirect?: boolean }>("sign-in/social", input);

  if (!result.data) return result;

  const { url, redirect } = result.data;

  // Only a web address: never `javascript:` or anything else a tampered answer could carry.
  if (!redirect || !url || !isWebAddress(url)) {
    return { data: null, error: { status: 0, message: "No sign-in address came back" } } satisfies AuthResult<never>;
  }
  window.location.href = url;

  return result;
}

function isWebAddress(url: string) {
  try {
    return /^https?:$/.test(new URL(url).protocol);
  } catch {
    return false;
  }
}

/** Signs the Member out; the header and Swiftter see it at once (lib/auth/member-hint.ts). */
export async function signOut() {
  const result = await post<{ success?: boolean }>("sign-out", {});

  if (result.data) setSessionMember(null);

  return result;
}

/**
 * Asks Neon Auth to email a password reset link. It answers the same whether
 * or not an account has that address. The link goes to Neon Auth, which
 * sends the browser on to `redirectTo` (an absolute address on this site,
 * one of Neon Auth's trusted domains) with `?token=…`, or `?error=INVALID_TOKEN`
 * once the link has expired or been used.
 */
export async function requestPasswordReset(input: { email: string; redirectTo: string }) {
  return post<{ status?: boolean }>("request-password-reset", input);
}

/** Sets a new password with the token from the reset link. Nobody is signed in by it. */
export async function resetPassword(input: { newPassword: string; token: string }) {
  return post<{ status?: boolean }>("reset-password", input);
}

/**
 * Asks Neon Auth to email a code that confirms the address. Signed in, it must
 * be the Member's own address; signed out (just signed up), Neon Auth answers
 * the same whether or not there is an unconfirmed account to send it to.
 */
export async function sendVerificationCode(input: { email: string }) {
  return post<{ status?: boolean }>("send-verification-email", input);
}

/**
 * Confirms an email address with the code Neon Auth sent. Neon Auth then
 * opens a session (its "sign in after verification" setting): the Member is
 * signed in, here as everywhere else on the page.
 */
export async function verifyEmailCode(input: { email: string; otp: string }) {
  const result = await post<SessionAnswer & { status?: boolean }>("email-otp/verify-email", input);

  if (result.data && signedIn(result.data)) setSessionMember(result.data.user ?? null);

  return result;
}
