import { NextResponse } from "next/server";

import { AuthUnavailableError, getSessionUser } from "@/lib/auth/server";
import { errorResponse } from "@/lib/swiftter-responses";
import { listHeld, listOwnReshares } from "@/service/swiftter";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * What only the signed-in Member sees: their notes that are not public
 * (pending or refused, with the reason) and the Posts they reshare. Kept out
 * of the public feed, which is the same for everyone. 401 signed out, 503 when
 * Neon Auth fails.
 */
export async function GET() {
	let user;

	try {
		user = await getSessionUser();
	} catch (error) {
		if (error instanceof AuthUnavailableError) return NextResponse.json({ error: "Signing in is unavailable just now." }, { status: 503, headers: PRIVATE });
		throw error;
	}

	if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: PRIVATE });

	try {
		const [held, reshared] = await Promise.all([listHeld(user.id), listOwnReshares(user.id)]);

		return NextResponse.json({ held, reshared }, { headers: PRIVATE });
	} catch (error) {
		return errorResponse(error, "Reading your notes");
	}
}
