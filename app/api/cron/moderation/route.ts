import { NextResponse } from "next/server";

import { purgeExpired, recheckPending } from "@/service/swiftter";

/** The hour (UTC) of the run that also purges what Swiftter no longer keeps: once a day, at night in Europe. */
const PURGE_HOUR_UTC = 3;

/**
 * Swiftter's scheduled work (vercel.json `crons`, hourly), in one cron job:
 * - the re-check of notes moderation gave no verdict for, retried for a week
 *   with a backoff (MODERATION_RETRY); a note given up on is logged as an
 *   error once, in the run that gave up on it, the alert to act on;
 * - once a day, the retention purge (purgeExpired).
 * Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`; anything
 * else is refused.
 */
export async function GET(request: Request) {
	const secret = process.env.CRON_SECRET;

	if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
		return NextResponse.json({ error: "Not allowed." }, { status: 401 });
	}

	const result = await recheckPending();

	if (result.gaveUp > 0) {
		// eslint-disable-next-line no-console
		console.error(`ALERT: ${result.gaveUp} Swiftter note(s) given up on: moderation gave no verdict for a week`);
	}

	const purged = new Date().getUTCHours() === PURGE_HOUR_UTC ? await purgeExpired() : null;

	return NextResponse.json({ ...result, purged });
}
