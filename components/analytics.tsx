"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

import { redactUrl } from "@/lib/analytics";

/**
 * Vercel Web Analytics: page views, without cookies. The root layout renders
 * it on Vercel's production deployment only (previews and local builds have no
 * /_vercel/insights to load the script from). Every
 * address is cleaned of private query parameters first (lib/analytics.ts).
 */
export function Analytics() {
  return <VercelAnalytics beforeSend={(event) => ({ ...event, url: redactUrl(event.url) })} />;
}
