import "server-only";

import { type AuthEmail, DEFAULT_VALIDITY_MS } from "./auth-emails";

/*
  Every account email with made-up data, for the previews: the styleguide's
  /styleguide/emails and `npm run email:preview`. The two the site sends
  today come first.
*/
export type EmailSample = { slug: string; title: string; inUse: boolean; email: AuthEmail };

const LINK = "https://auth.example.invalid/reset-password/sample-token?callbackURL=%2Freset-password";

export const EMAIL_SAMPLES: EmailSample[] = [
  {
    slug: "verify-email-code",
    title: "Email verification code",
    inUse: true,
    email: { purpose: "email-verification", method: "code", code: "428613", name: "Betty & James", validForMs: DEFAULT_VALIDITY_MS.code },
  },
  {
    slug: "reset-password-link",
    title: "Password reset link",
    inUse: true,
    email: { purpose: "forget-password", method: "link", url: LINK, name: "Swiftter Tester", validForMs: DEFAULT_VALIDITY_MS.link },
  },
  {
    slug: "sign-in-code",
    title: "Sign-in code",
    inUse: false,
    email: { purpose: "sign-in", method: "code", code: "190713", validForMs: DEFAULT_VALIDITY_MS.code },
  },
  {
    slug: "sign-in-link",
    title: "Sign-in link",
    inUse: false,
    email: { purpose: "sign-in", method: "link", url: LINK.replace("reset-password/", "magic-link/"), name: "Dorothea", validForMs: 10 * 60_000 },
  },
  {
    slug: "reset-password-code",
    title: "Password reset code",
    inUse: false,
    email: { purpose: "forget-password", method: "code", code: "131989", name: "Swiftter Tester" },
  },
  {
    slug: "verify-email-link",
    title: "Email verification link",
    inUse: false,
    email: { purpose: "email-verification", method: "link", url: LINK.replace("reset-password/", "verify-email/"), name: "Swiftter Tester" },
  },
];
