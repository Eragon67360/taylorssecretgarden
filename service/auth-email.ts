import "server-only";

import type { OwnerAlert } from "@/service/owner-alerts";

import { z } from "zod";

import { siteResetLink } from "@/lib/auth/reset-link";
import { type KeyLookup, jwksKeyLookup, verifyNeonSignature } from "@/lib/auth/webhook-signature";
import { type AuthEmail, renderAuthEmail } from "@/lib/emails/auth-emails";
import { sendEmail } from "@/service/resend";

/*
  Neon Auth's account emails, sent by the site (#167, docs/adr/0009). With the
  branch's webhooks subscribed to `send.otp` and `send.magic_link`, Neon Auth
  no longer sends its own email: it calls app/api/auth-email with the code or
  link, and the site sends it in the journal's look through Resend.

  Neon Auth's contract (https://neon.com/docs/auth/guides/webhooks): any 2xx
  means delivered. A 5xx, 408, 429 or no answer within the attempt's timeout
  (5 s by default) is tried again at once, up to 3 attempts within 15 s, with
  the same event id; any other 4xx is final. If no attempt succeeds the
  Member's request fails and they see an error: Neon Auth does NOT fall back
  to its own email. So:
  - unsigned or forged calls: 401, no detail;
  - the site not set up (no RESEND_API_KEY or NEON_AUTH_BASE_URL): 503;
  - a signed payload the site cannot read (Neon changed its contract): 422,
    final, and the owner is told;
  - Resend failing: 502, so Neon tries again; Resend's Idempotency-Key, from
    the event id, makes sure a retry never sends a second email.

  Never logged or alerted: the address, the name, the code, the link.
*/

const PURPOSE = z.enum(["sign-in", "email-verification", "forget-password"]);

const ENVELOPE = z.object({
  event_id: z.string().min(1).max(200),
  event_type: z.string(),
  timestamp: z.string().optional(),
});

const USER = z.object({ email: z.email().max(320), name: z.string().nullish() });

const OTP_EVENT = ENVELOPE.extend({
  event_type: z.literal("send.otp"),
  user: USER,
  event_data: z.object({
    otp_code: z.string().regex(/^[A-Za-z0-9]{4,12}$/),
    otp_type: PURPOSE,
    // "sms" comes from the Phone Number plugin, which the site does not use.
    delivery_preference: z.literal("email").optional(),
    expires_at: z.string().optional(),
  }),
});

const LINK_EVENT = ENVELOPE.extend({
  event_type: z.literal("send.magic_link"),
  user: USER,
  event_data: z.object({
    link_type: PURPOSE,
    link_url: z.url({ protocol: /^https$/ }).max(2048),
    expires_at: z.string().optional(),
  }),
});

/** The events this route sends an email for. Anything else Neon Auth is subscribed to is acknowledged and ignored. */
const EMAIL_EVENTS = new Set(["send.otp", "send.magic_link"]);

export type AuthEmailDeps = {
  env?: Partial<Record<string, string>>;
  /** The Neon Auth signing keys; from the branch's JWKS when not given. */
  lookup?: KeyLookup;
  fetch?: typeof fetch;
  now?: () => number;
  /** Tells the owner, after the answer has gone (the route defers notifyOwner). */
  alert?: (alert: OwnerAlert) => void;
};

/** The JWKS lookups, one per Neon Auth URL, kept across calls on a warm instance. */
const lookups = new Map<string, KeyLookup>();

function lookupFor(baseUrl: string): KeyLookup {
  let lookup = lookups.get(baseUrl);

  if (!lookup) {
    lookup = jwksKeyLookup(`${baseUrl.replace(/\/+$/, "")}/.well-known/jwks.json`);
    lookups.set(baseUrl, lookup);
  }

  return lookup;
}

/** How long the code or link works: from when Neon Auth made it to when it expires, if both are given. */
function validFor(timestamp: string | undefined, expiresAt: string | undefined): number | undefined {
  const ms = Date.parse(expiresAt ?? "") - Date.parse(timestamp ?? "");

  return Number.isFinite(ms) && ms > 0 ? ms : undefined;
}

const empty = (status: number) => new Response(null, { status });

/** The alert for an account email that did not go out: what kind, and why, never who. */
function failedAlert(what: string, detail: string[]): OwnerAlert {
  return {
    title: "Account emails: one did not go out",
    body: [
      `${what} Members asking for a code or a password reset link get an error until this is fixed: Neon Auth does not send its own email while its webhook is subscribed.`,
      "",
      ...detail.map((line) => `- ${line}`),
      "",
      "See the Vercel logs of /api/auth-email around this time, and the README (Account emails). To fall back on Neon Auth's own emails, disable the webhook in the Neon console (Auth → Configuration → Webhooks).",
    ].join("\n"),
    labels: ["account-emails"],
  };
}

/**
 * Handles one call of Neon Auth's webhook: checks its signature, renders the
 * email and sends it. Answers as Neon Auth expects (see above).
 */
export async function handleAuthEmailWebhook(request: Request, deps: AuthEmailDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const now = deps.now ?? Date.now;
  const alert = deps.alert ?? (() => {});
  const baseUrl = env.NEON_AUTH_BASE_URL;
  const apiKey = env.RESEND_API_KEY;

  if (!baseUrl) {
    // eslint-disable-next-line no-console
    console.error("Account email webhook called, but NEON_AUTH_BASE_URL is not set: its signature cannot be checked");

    return empty(503);
  }

  const rawBody = await request.text();
  const headers = {
    signature: request.headers.get("x-neon-signature"),
    kid: request.headers.get("x-neon-signature-kid"),
    timestamp: request.headers.get("x-neon-timestamp"),
  };
  let verdict: Awaited<ReturnType<typeof verifyNeonSignature>>;

  try {
    verdict = await verifyNeonSignature(rawBody, headers, deps.lookup ?? lookupFor(baseUrl), now());
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Account email webhook: Neon Auth's signing keys could not be fetched", error instanceof Error ? error.message : error);

    return empty(503);
  }

  if (!verdict.ok) {
    // eslint-disable-next-line no-console
    console.warn(`Account email webhook refused a call (${verdict.reason})`);

    return empty(401);
  }

  // Signed by Neon Auth from here on.
  let json: unknown;

  try {
    json = JSON.parse(rawBody);
  } catch {
    json = undefined;
  }

  const envelope = ENVELOPE.safeParse(json);
  const eventType = envelope.success ? envelope.data.event_type : "unknown";

  if (envelope.success && !EMAIL_EVENTS.has(eventType)) {
    // eslint-disable-next-line no-console
    console.warn(`Account email webhook ignored a ${eventType} event: the site sends no email for it`);

    return empty(204);
  }

  const event = eventType === "send.otp" ? OTP_EVENT.safeParse(json) : LINK_EVENT.safeParse(json);

  if (!event.success) {
    // The paths of what did not match, not the values.
    const paths = [...new Set(event.error.issues.map((issue) => issue.path.join(".") || "(payload)"))].join(", ");

    // eslint-disable-next-line no-console
    console.error(`Account email webhook could not read a signed ${eventType} event (${paths})`);
    alert(failedAlert("Neon Auth sent a payload the site does not understand: has its webhook contract changed?", [`event: ${eventType}`, `fields: ${paths}`]));

    return empty(422);
  }

  const { data } = event;
  const email: AuthEmail =
    data.event_type === "send.otp"
      ? {
          purpose: data.event_data.otp_type,
          method: "code",
          code: data.event_data.otp_code,
          name: data.user.name,
          validForMs: validFor(data.timestamp, data.event_data.expires_at),
        }
      : {
          purpose: data.event_data.link_type,
          method: "link",
          // Password resets point at the site's own address, with Neon Auth's token (lib/auth/reset-link.ts).
          url: data.event_data.link_type === "forget-password" ? siteResetLink(data.event_data.link_url, baseUrl) : data.event_data.link_url,
          name: data.user.name,
          validForMs: validFor(data.timestamp, data.event_data.expires_at),
        };
  const kind = `${email.purpose} ${email.method}`;

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.error(`Account email not sent (${kind}): RESEND_API_KEY is not set`);
    alert(failedAlert("RESEND_API_KEY is not set, but Neon Auth's webhook is subscribed.", [`email: ${kind}`, `event: \`${data.event_id}\``]));

    return empty(503);
  }

  // Deterministic for an event (nothing in it depends on the time it is rendered), so a
  // retry sends Resend the same request under the same key, as idempotency requires.
  const { subject, html, text } = renderAuthEmail(email);
  const sent = await sendEmail({ to: data.user.email, subject, html, text }, { apiKey, idempotencyKey: `neon-auth/${data.event_id}`, fetch: deps.fetch });

  if (!sent.ok) {
    const attempt = request.headers.get("x-neon-delivery-attempt") ?? "?";

    // eslint-disable-next-line no-console
    console.error(`Account email not sent (${kind}): Resend answered ${sent.status ?? "nothing"} ${sent.error}, attempt ${attempt}`);
    alert(
      failedAlert("Resend did not send an account email.", [
        `email: ${kind}`,
        `Resend: ${sent.status ?? "no answer"} \`${sent.error}\``,
        `Neon Auth attempt: ${attempt} of 3 (it tries again on this 502)`,
        `event: \`${data.event_id}\``,
      ]),
    );

    return empty(502);
  }

  // eslint-disable-next-line no-console
  console.info(`Account email sent (${kind}), Resend id ${sent.id}`);

  return empty(204);
}
