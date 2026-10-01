"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

import { redactUrl } from "@/lib/analytics";

/**
 * Vercel Web Analytics: page views, without cookies, on production only (the
 * package sends nothing in development or on previews unless told to). Every
 * address is cleaned of private query parameters first (lib/analytics.ts).
 */
export function Analytics() {
  return <VercelAnalytics beforeSend={(event) => ({ ...event, url: redactUrl(event.url) })} />;
}
