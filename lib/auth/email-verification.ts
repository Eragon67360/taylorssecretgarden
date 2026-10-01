/*
  Confirming a Member's email address (#82). Neon Auth sends a code (its
  "verification code" method, which works with Neon's shared sender on
  development branches as with our own SMTP on production) and opens a
  session once it is entered. Whether Swiftter insists on it is ours to say:
  REQUIRE_EMAIL_VERIFICATION, off unless set to "true", so the owner turns it
  on after this code is deployed and Neon Auth's "Verify at sign-up" is on.
  Google sign-ins arrive confirmed.
*/

type Env = Partial<Record<string, string>>;

/** Whether only Members with a confirmed email address may write on Swiftter. */
export function isEmailVerificationRequired(env: Env = process.env): boolean {
  return env.REQUIRE_EMAIL_VERIFICATION?.trim().toLowerCase() === "true";
}

/** What an unconfirmed Member reads when Swiftter refuses their note (403). */
export const UNVERIFIED_REFUSAL = "Confirm your email address first: your guestbook page sends you a code.";
