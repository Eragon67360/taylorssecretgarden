import "server-only";

import { siteConfig } from "@/config/site";

/*
  Sending one email through Resend's REST API
  (https://resend.com/docs/api-reference/emails/send-email), with fetch: the
  one call the site makes needs no SDK. RESEND_API_KEY is a sending-only key,
  restricted to the domain, set in Vercel for Production only (Sensitive).
*/

const ENDPOINT = "https://api.resend.com/emails";

/** Who the account emails come from. The domain is verified in Resend. */
export const ACCOUNT_EMAIL_SENDER = "Taylor's Secret Garden <noreply@taylorssecretgarden.com>";

/** How long Resend may take: Neon Auth gives the whole webhook call 5 seconds per attempt. */
const TIMEOUT_MS = 3_000;

export type OutgoingEmail = { to: string; subject: string; html: string; text: string };

/** Sent (Resend's id), or why not: Resend's status and error name only, never its message, which may quote the address. */
export type SendResult = { ok: true; id: string } | { ok: false; status?: number; error: string };

/**
 * Sends `email` from ACCOUNT_EMAIL_SENDER, replies going to the site's
 * contact address. `idempotencyKey` makes a repeated call (a retry) return
 * the first one's result instead of sending again, for 24 hours. Never
 * throws.
 */
export async function sendEmail(
  email: OutgoingEmail,
  { apiKey, idempotencyKey, fetch: send = fetch }: { apiKey: string; idempotencyKey: string; fetch?: typeof fetch },
): Promise<SendResult> {
  try {
    const response = await send(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
        "User-Agent": "taylorssecretgarden-account-emails",
      },
      body: JSON.stringify({
        from: ACCOUNT_EMAIL_SENDER,
        to: [email.to],
        reply_to: siteConfig.contactEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: unknown; name?: unknown };

    if (response.ok && typeof body.id === "string") return { ok: true, id: body.id };

    return { ok: false, status: response.status, error: typeof body.name === "string" ? body.name : "unknown_error" };
  } catch (error) {
    return { ok: false, error: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network_error" };
  }
}
