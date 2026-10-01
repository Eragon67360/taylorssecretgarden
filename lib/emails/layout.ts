import "server-only";

import { PRODUCTION_URL, siteConfig } from "@/config/site";

/*
  The journal's look for email, within what mail apps render: one table
  layout, inline styles (Gmail and Outlook drop much else), the journal's
  colours from styles/globals.css as literals, Georgia for headings and the
  system's own face for text (no web fonts), and the wordmark as a PNG.

  Dark mode: the email says it handles both schemes, and apps that honour
  `prefers-color-scheme` in an email (Apple Mail, Outlook on the web and on
  Mac) get the dark journal from the <style> below. Apps that invert colours
  themselves (Gmail's apps, Outlook on Windows) get light-on-dark versions of
  colours chosen to survive it: no pure white or black, the wine button
  keeping its light label, and the wordmark on its own paper label, since
  images are never inverted.
*/

const PAPER = siteConfig.colors.paper;
const CARD = siteConfig.colors.card;
const INK = siteConfig.colors.ink;
const SOFT = siteConfig.colors.soft;
const ACCENT = siteConfig.colors.accent;
const LINE = "#e2d3bb";
const ON_ACCENT = "#fff6ec";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace";

/** The wordmark image (scripts/build-email-wordmark.ts draws it at twice this size), under public/. */
export const WORDMARK = { path: "/email/wordmark.png", width: 300, height: 56 } as const;

export type EmailUrls = {
  /** Where the email's links point: production, whatever deployment sends it (a preview's address may be protected). */
  siteUrl?: string;
  /** Where its image is loaded from, when not the site (a local preview). */
  assetsUrl?: string;
};

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Text made safe for HTML, in an element or a quoted attribute. Every interpolated value goes through it. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

/** A Member's name fit to greet them with: one line, no control characters, at most 60 characters. */
export function displayableName(name: string | null | undefined): string | undefined {
  const cleaned = (name ?? "")
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return undefined;

  return [...cleaned].length > 60 ? `${[...cleaned].slice(0, 59).join("").trimEnd()}…` : cleaned;
}

/** A paragraph of the card's text. `html` is already escaped. */
export function paragraph(html: string, { soft = false, size = 16 } = {}): string {
  return `<p class="${soft ? "soft" : "ink"}" style="margin:0 0 16px;font-family:${SANS};font-size:${size}px;line-height:1.6;color:${soft ? SOFT : INK};">${html}</p>`;
}

/** A one-time code, big, spaced and in one piece, so a double-click selects (and copies) exactly the code. */
export function codeBlock(code: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 20px;">
<tr><td align="center" class="code" bgcolor="${PAPER}" style="background-color:${PAPER};border:2px dashed ${ACCENT};border-radius:8px;padding:18px 12px;">
<span class="code-text ink" style="font-family:${MONO};font-size:36px;line-height:1.2;font-weight:700;letter-spacing:10px;padding-left:10px;color:${INK};">${escapeHtml(code)}</span>
</td></tr>
</table>`;
}

/** A button that is a table cell holding a link, so it renders (and is clickable all over) in every mail app. */
export function button(label: string, url: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
<tr><td align="center" bgcolor="${ACCENT}" style="background-color:${ACCENT};border-radius:6px;">
<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:14px 28px;border:1px solid ${ACCENT};border-radius:6px;font-family:${SANS};font-size:16px;line-height:1.2;font-weight:700;color:${ON_ACCENT};text-decoration:none;">${escapeHtml(label)}</a>
</td></tr>
</table>`;
}

/** The address behind a button, written out for when the button cannot be pressed. */
export function linkFallback(url: string): string {
  return paragraph(
    `Button not working? Copy this address into your browser:<br><a class="link" href="${escapeHtml(url)}" target="_blank" style="color:${ACCENT};word-break:break-all;">${escapeHtml(url)}</a>`,
    { soft: true, size: 14 },
  );
}

type Layout = {
  /** The subject, also the document's title. */
  subject: string;
  /** What inbox lists show after the subject. */
  preheader: string;
  /** Small capitals above the heading. */
  kicker: string;
  heading: string;
  /** The card's content below the heading: built from the helpers above, so already escaped. */
  body: string;
};

/** A whole email: the paper page, the wordmark, the white card, and the footer. */
export function emailLayout({ subject, preheader, kicker, heading, body }: Layout, { siteUrl = PRODUCTION_URL, assetsUrl = siteUrl }: EmailUrls = {}): string {
  const site = escapeHtml(siteUrl);
  const footerLink = (href: string, label: string) =>
    `<a class="link" href="${escapeHtml(href)}" style="color:${SOFT};text-decoration:underline;">${label}</a>`;
  // Inbox apps show the first text they find after the subject: the preheader, then enough
  // invisible spacing that nothing from the email itself follows it.
  const spacer = "&#847;&zwnj;&nbsp;".repeat(60);

  return `<!doctype html>
<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; }
  @media (prefers-color-scheme: dark) {
    .page { background-color: #1e1612 !important; }
    .card { background-color: #2b211b !important; border-color: #4a3a2e !important; }
    .ink { color: #f3eadb !important; }
    .soft, .soft a, .link { color: #d9c8b3 !important; }
    .code { background-color: #3a2c23 !important; border-color: #c9808b !important; }
  }
  @media (max-width: 600px) {
    .card { padding: 28px 22px !important; }
    .code-text { font-size: 30px !important; letter-spacing: 6px !important; padding-left: 6px !important; }
  }
</style>
</head>
<body class="page" style="margin:0;padding:0;background-color:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${PAPER};opacity:0;">${escapeHtml(preheader)}${spacer}</div>
<table role="presentation" class="page" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${PAPER}" style="background-color:${PAPER};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;">
<tr><td align="center" style="padding:0 0 20px;">
<a href="${site}/" target="_blank"><img src="${escapeHtml(assetsUrl)}${WORDMARK.path}" width="${WORDMARK.width}" height="${WORDMARK.height}" alt="Taylor's Secret Garden" style="display:block;border:0;outline:none;width:${WORDMARK.width}px;max-width:100%;height:auto;font-family:${SERIF};font-size:24px;color:${INK};"></a>
</td></tr>
<tr><td class="card" bgcolor="${CARD}" style="background-color:${CARD};border:1px solid ${LINE};border-radius:8px;padding:36px 40px;">
<p class="soft" style="margin:0 0 8px;font-family:${SANS};font-size:11px;line-height:1.4;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${SOFT};">${escapeHtml(kicker)}</p>
<h1 class="ink" style="margin:0 0 20px;font-family:${SERIF};font-size:30px;line-height:1.15;font-weight:600;color:${INK};">${escapeHtml(heading)}</h1>
${body}
</td></tr>
<tr><td class="soft" align="center" style="padding:24px 8px 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${SOFT};">
Taylor's Secret Garden, an unofficial Taylor Swift fan scrapbook.<br>
${footerLink(`${siteUrl}/`, "taylorssecretgarden.com")} · ${footerLink(`mailto:${siteConfig.contactEmail}`, escapeHtml(siteConfig.contactEmail))}<br>
${footerLink(`${siteUrl}/privacy`, "Privacy policy")} · ${footerLink(`${siteUrl}/legal`, "Legal notice")}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
}

/** The plain-text footer every email ends with. */
export function textFooter({ siteUrl = PRODUCTION_URL }: EmailUrls = {}): string {
  return [
    "--",
    "Taylor's Secret Garden, an unofficial Taylor Swift fan scrapbook.",
    `${siteUrl}/ · ${siteConfig.contactEmail}`,
    `Privacy policy: ${siteUrl}/privacy · Legal notice: ${siteUrl}/legal`,
  ].join("\n");
}
