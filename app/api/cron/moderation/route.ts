import { NextResponse } from "next/server";

import { recheckPending } from "@/service/swiftter";

/**
 * The scheduled re-check of notes moderation gave no verdict for (vercel.json
 * `crons`, every 15 minutes). Vercel Cron calls it with
 * `Authorization: Bearer $CRON_SECRET`; anything else is refused. Attempts are
 * capped and backed off (service/swiftter.ts); a note still pending after an
 * hour is logged as an error, the alert to act on.
 */
export async function GET(request: Request) {
	const secret = process.env.CRON_SECRET;

	if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
		return NextResponse.json({ error: "Not allowed." }, { status: 401 });
	}

	const result = await recheckPending();

	if (result.stillPendingOverAnHour > 0) {
		// eslint-disable-next-line no-console
		console.error(`ALERT: ${result.stillPendingOverAnHour} Swiftter note(s) pending moderation for over an hour`);
	}

	return NextResponse.json(result);
}
