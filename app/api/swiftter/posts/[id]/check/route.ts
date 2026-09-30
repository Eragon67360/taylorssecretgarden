import { memberWrite } from "@/lib/member-write";
import { errorResponse, outcomeResponse } from "@/lib/swiftter-responses";
import { feedChanged } from "@/service/feed-cache";
import { checkAgain } from "@/service/swiftter";

type Context = { params: Promise<{ id: string }> };

/**
 * "Check again": moderates one of your own pending notes once more (it had no
 * verdict yet). Answers like publishing (201 / 422 / 202); 404 when it is not
 * your pending note, 409 once its checks are used up.
 */
export function POST(request: Request, { params }: Context) {
	return memberWrite(
		request,
		async (writer) => {
			try {
				const outcome = await checkAgain(writer.id, (await params).id);

				if (outcome.status === "approved") feedChanged();

				return outcomeResponse(outcome);
			} catch (error) {
				return errorResponse(error, "Checking your note");
			}
		},
		{ body: false },
	);
}
