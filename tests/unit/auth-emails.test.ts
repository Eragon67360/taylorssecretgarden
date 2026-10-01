import { describe, expect, it } from "vitest";

import { type AuthEmail, renderAuthEmail, validityPhrase } from "@/lib/emails/auth-emails";
import { displayableName, escapeHtml } from "@/lib/emails/layout";
import { EMAIL_SAMPLES } from "@/lib/emails/samples";

const code: AuthEmail = { purpose: "email-verification", method: "code", code: "428613", name: "Jane", validForMs: 5 * 60_000 };
const link: AuthEmail = { purpose: "forget-password", method: "link", url: "https://auth.example.invalid/reset-password/t?x=1&y=2", validForMs: 60 * 60_000 };

describe("renderAuthEmail", () => {
  it("escapes the Member's name in the HTML, and keeps it as written in the text", () => {
    const { html, text } = renderAuthEmail({ ...code, name: `<img src=x onerror="alert(1)"> & 'Betty'` });

    expect(html).not.toContain("<img src=x");
    expect(html).toContain("Hi &lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;Betty&#39;,");
    expect(text).toContain(`Hi <img src=x onerror="alert(1)"> & 'Betty',`);
  });

  it("escapes the link in its href and in the address written out", () => {
    const { html, text } = renderAuthEmail({ ...link, url: `https://auth.example.invalid/r?a=1&b="><script>x</script>` });

    expect(html).not.toContain("<script>");
    expect(html).toContain('href="https://auth.example.invalid/r?a=1&amp;b=&quot;&gt;&lt;script&gt;x&lt;/script&gt;"');
    expect(text).toContain(`Choose a new password: https://auth.example.invalid/r?a=1&b="><script>x</script>`);
  });

  it("puts the code in the email in one piece, in the text and the preheader", () => {
    const { html, text, preheader, subject } = renderAuthEmail(code);

    expect(html).toMatch(/>428613<\/span>/);
    expect(text).toContain("    428613");
    expect(preheader).toBe("Your code is 428613. It works for 5 minutes.");
    expect(subject).toBe("Confirm your email address");
  });

  it("says how long a code or link works", () => {
    expect(renderAuthEmail(code).text).toContain("This code works for 5 minutes.");
    expect(renderAuthEmail(code).html).toContain("This code works for 5 minutes.");
    expect(renderAuthEmail(link).text).toContain("This link works for 1 hour, and only once.");
    expect(renderAuthEmail(link).html).toContain("This link works for 1 hour, and only once.");
  });

  it("falls back on Neon Auth's usual lifetimes when the payload does not say", () => {
    expect(renderAuthEmail({ ...code, validForMs: undefined }).text).toContain("This code works for 5 minutes.");
    expect(renderAuthEmail({ ...link, validForMs: Number.NaN }).text).toContain("This link works for 1 hour");
  });

  it("says why it was sent and that it can be ignored", () => {
    const { html, text } = renderAuthEmail(link);

    expect(text).toContain("You're getting this because someone asked to reset the password");
    expect(text).toContain("If this wasn't you, ignore this email: your password stays as it is.");
    expect(html).toContain("If this wasn&#39;t you, ignore this email: your password stays as it is.");
  });

  it("greets without a name when there is none", () => {
    expect(renderAuthEmail({ ...code, name: null }).text).toContain("\nHi,\n");
    expect(renderAuthEmail({ ...code, name: "   " }).text).toContain("\nHi,\n");
  });

  it("is a complete email: language, both colour schemes, the wordmark with its size and alt text, the footer, 560px wide", () => {
    const { html } = renderAuthEmail(link);

    expect(html).toMatch(/^<!doctype html>\n<html lang="en"/);
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
    expect(html).toContain('<img src="https://www.taylorssecretgarden.com/email/wordmark.png" width="300" height="56" alt="Taylor\'s Secret Garden"');
    expect(html).toContain("max-width:560px");
    expect(html).toContain('href="mailto:contact@taylorssecretgarden.com"');
    expect(html).toContain('href="https://www.taylorssecretgarden.com/privacy"');
    expect(html).toContain('href="https://www.taylorssecretgarden.com/legal"');
  });

  it("has a plain-text version for every email, with the footer and without HTML", () => {
    for (const { email } of EMAIL_SAMPLES) {
      const { text } = renderAuthEmail(email);

      expect(text).toContain("contact@taylorssecretgarden.com");
      expect(text).toContain("https://www.taylorssecretgarden.com/privacy");
      expect(text).not.toMatch(/<\/?(p|a|table|td|strong)\b/);
    }
  });

  it("renders the same email twice for the same input (a retry must match for Resend's idempotency)", () => {
    expect(renderAuthEmail(link)).toEqual(renderAuthEmail(link));
  });
});

describe("validityPhrase", () => {
  it("says minutes, or whole hours", () => {
    expect(validityPhrase(5 * 60_000)).toBe("5 minutes");
    expect(validityPhrase(60_000)).toBe("1 minute");
    expect(validityPhrase(4 * 60_000 + 59_000)).toBe("5 minutes");
    expect(validityPhrase(60 * 60_000)).toBe("1 hour");
    expect(validityPhrase(3 * 60 * 60_000)).toBe("3 hours");
    expect(validityPhrase(90 * 60_000)).toBe("90 minutes");
    expect(validityPhrase(1000)).toBe("1 minute");
  });
});

describe("escapeHtml and displayableName", () => {
  it("escapes the five characters that matter in HTML", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe("&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  });

  it("keeps a name to one short line", () => {
    expect(displayableName("Jane\r\nBcc: someone")).toBe("Jane Bcc: someone");
    expect(displayableName("x".repeat(80))).toBe(`${"x".repeat(59)}…`);
    expect(displayableName(undefined)).toBeUndefined();
  });
});
