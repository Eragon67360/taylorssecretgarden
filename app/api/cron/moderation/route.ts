import { NextResponse } from "next/server";

import { recheckPending } from "@/service/swiftter";

/**
 * The scheduled re-check of notes moderation gave no verdict for (vercel.json
 * `crons`). Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`;
 * anything else is refused. Notes are retried for a week with a backoff
 * (MODERATION_RETRY); a note given up on is logged as an error once, in the
 * run that gave up on it, the alert to act on.
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

	return NextResponse.json(result);
}
