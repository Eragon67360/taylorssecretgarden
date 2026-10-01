import "server-only";

import { type EmailUrls, button, codeBlock, displayableName, emailLayout, escapeHtml, linkFallback, paragraph, textFooter } from "./layout";

/*
  The account emails Neon Auth asks the site to send (app/api/auth-email):
  a code or a link, for one of three purposes. The site uses two of the six
  (#82, #118): a code to confirm an email address, a link to reset a
  password; the other four are written too, so whatever Neon Auth sends
  arrives in the journal's look rather than not at all.

  English only: Neon Auth's payload says nothing of the Member's language
  (no locale, no Accept-Language), and the site is in English.
*/

/** What the email is for, in Neon Auth's words (`otp_type` / `link_type`). */
export type AuthEmailPurpose = "sign-in" | "email-verification" | "forget-password";

export type AuthEmail = {
  purpose: AuthEmailPurpose;
  /** The Member's name, if Neon Auth sent it. */
  name?: string | null;
  /** How long the code or link works, from when it was made; the usual lifetime when unknown. */
  validForMs?: number;
} & ({ method: "code"; code: string } | { method: "link"; url: string });

export type RenderedEmail = { subject: string; preheader: string; html: string; text: string };

/** How long Neon Auth keeps them (#82, #118): said when the payload does not say. */
export const DEFAULT_VALIDITY_MS = { code: 5 * 60_000, link: 60 * 60_000 } as const;

type Copy = {
  subject: string;
  kicker: string;
  heading: string;
  /** What to do with the code or link. */
  intro: { code: string; link: string };
  /** The button's label. */
  action: string;
  /** Why they got it. */
  reason: string;
  /** Why ignoring it is safe. */
  ignore: string;
  /** Whether the link works once only. */
  once: boolean;
};

const COPY: Record<AuthEmailPurpose, Copy> = {
  "email-verification": {
    subject: "Confirm your email address",
    kicker: "Your guestbook · email address",
    heading: "Confirm your email address",
    intro: {
      code: "Enter this code on your guestbook page to confirm that this email address is yours.",
      link: "Press the button to confirm that this email address is yours.",
    },
    action: "Confirm my email address",
    reason: "You're getting this because someone asked to confirm this address for an account on Taylor's Secret Garden.",
    ignore: "If this wasn't you, ignore this email: nothing is confirmed without it.",
    once: false,
  },
  "forget-password": {
    subject: "Choose a new password",
    kicker: "Your guestbook · password",
    heading: "Choose a new password",
    intro: {
      code: "Enter this code where you asked for it to choose a new password.",
      link: "Press the button to choose a new password for your account.",
    },
    action: "Choose a new password",
    reason: "You're getting this because someone asked to reset the password of the account that uses this address on Taylor's Secret Garden.",
    ignore: "If this wasn't you, ignore this email: your password stays as it is.",
    once: true,
  },
  "sign-in": {
    subject: "Sign in to Taylor's Secret Garden",
    kicker: "Your guestbook · signing in",
    heading: "Sign in to Taylor's Secret Garden",
    intro: {
      code: "Enter this code where you asked for it to sign in.",
      link: "Press the button to sign in.",
    },
    action: "Sign in",
    reason: "You're getting this because someone asked to sign in to Taylor's Secret Garden with this address.",
    ignore: "If this wasn't you, ignore this email: nobody can sign in without it.",
    once: true,
  },
};

/** "5 minutes", "1 hour": how long something works, to the minute. */
export function validityPhrase(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  const count = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

  return minutes >= 60 && minutes % 60 === 0 ? count(minutes / 60, "hour") : count(Math.max(minutes, 1), "minute");
}

/**
 * The email for a code or link, as HTML and plain text. Every value from the
 * payload (the name, the code, the link) is escaped in the HTML; the text
 * version is plain text, which mail apps never interpret.
 */
export function renderAuthEmail(email: AuthEmail, urls: EmailUrls = {}): RenderedEmail {
  const copy = COPY[email.purpose];
  const name = displayableName(email.name);
  const validFor = validityPhrase(email.validForMs && email.validForMs > 0 ? email.validForMs : DEFAULT_VALIDITY_MS[email.method]);
  const greeting = name ? `Hi ${name},` : "Hi,";
  const intro = copy.intro[email.method];
  const expiry = email.method === "code" ? `This code works for ${validFor}.` : `This link works for ${validFor}${copy.once ? ", and only once" : ""}.`;
  const preheader = email.method === "code" ? `Your code is ${email.code}. It works for ${validFor}.` : `${copy.action}: the link works for ${validFor}.`;

  const html = emailLayout(
    {
      subject: copy.subject,
      preheader,
      kicker: copy.kicker,
      heading: copy.heading,
      body: [
        paragraph(escapeHtml(greeting)),
        paragraph(escapeHtml(intro)),
        email.method === "code" ? codeBlock(email.code) : button(copy.action, email.url),
        paragraph(`<strong>${escapeHtml(expiry)}</strong>`),
        email.method === "link" ? linkFallback(email.url) : "",
        paragraph(`${escapeHtml(copy.reason)} ${escapeHtml(copy.ignore)}`, { soft: true, size: 14 }),
      ].join("\n"),
    },
    urls,
  );

  const text = [
    copy.heading,
    "",
    greeting,
    "",
    intro,
    "",
    email.method === "code" ? `    ${email.code}` : `${copy.action}: ${email.url}`,
    "",
    expiry,
    "",
    `${copy.reason} ${copy.ignore}`,
    "",
    textFooter(urls),
    "",
  ].join("\n");

  return { subject: copy.subject, preheader, html, text };
}
