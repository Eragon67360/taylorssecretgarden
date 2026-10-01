import { NextResponse } from "next/server";

import { feedChanged } from "@/service/feed-cache";
import { givenUpAlert, notifyOwner, reportsAlert } from "@/service/owner-alerts";
import { listReportsToNotify, markReportsNotified, purgeExpired, recheckPending } from "@/service/swiftter";

/** The hour (UTC) of the run that also purges what Swiftter no longer keeps: once a day, at night in Europe. */
const PURGE_HOUR_UTC = 3;

/**
 * Swiftter's scheduled work (vercel.json `crons`, hourly), in one cron job:
 * - the re-check of notes moderation gave no verdict for, retried for a week
 *   with a backoff (MODERATION_RETRY); the notes given up on in a run make one
 *   owner alert (service/owner-alerts.ts), the alert to act on;
 * - the reports and appeals Members sent since the last run, summed up in one
 *   owner alert (not one per click); marked sent only once it went out, so a
 *   GitHub failure is retried at the next run;
 * - once a day, the retention purge (purgeExpired).
 * Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`; anything
 * else is refused.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }

  const { gaveUpIds, ...result } = await recheckPending();

  // Notes it passed are public now: the cached first page of the feed is out of date.
  if (result.approved > 0) feedChanged();

  if (gaveUpIds.length > 0) await notifyOwner(givenUpAlert(gaveUpIds));

  const reports = await listReportsToNotify();
  let reportsSent = 0;

  if (reports.length > 0) {
    const delivery = await notifyOwner(reportsAlert(reports));

    if (!(delivery.channel === "log" && delivery.error)) {
      await markReportsNotified(reports.map((report) => report.id));
      reportsSent = reports.length;
    }
  }

  const purged = new Date().getUTCHours() === PURGE_HOUR_UTC ? await purgeExpired() : null;

  // Anything removed may have been on the cached first page (a reshare, a torn-up note).
  if (purged && Object.values(purged).some((count) => count > 0)) feedChanged();

  return NextResponse.json({ ...result, reportsSent, purged });
}
