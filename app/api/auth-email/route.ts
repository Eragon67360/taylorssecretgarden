import { after } from "next/server";

import { handleAuthEmailWebhook } from "@/service/auth-email";
import { notifyOwner } from "@/service/owner-alerts";

/*
  Neon Auth's webhook for account emails (`send.otp`, `send.magic_link`):
  service/auth-email.ts checks the call's signature and sends the email
  through Resend (#167, docs/adr/0009).

  On purpose not under /api/auth: that path is the proxy to Neon Auth
  (app/api/auth/[...path]), which forwards only the browser's endpoints, and
  BotID guards some of them. This caller is Neon Auth's server, which has no
  BotID token and must not be proxied anywhere: its signature is the check.
*/
export async function POST(request: Request) {
  // An alert goes to GitHub after the answer: Neon Auth waits for this route (5 s per attempt), the Member with it.
  return handleAuthEmailWebhook(request, { alert: (alert) => after(() => notifyOwner(alert)) });
}
