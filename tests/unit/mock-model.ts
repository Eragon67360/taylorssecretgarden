import { MockLanguageModelV4 } from "ai/test";

/** What the mock model was asked: its system instructions and user prompt, as plain text. */
export type Asked = { system: string; prompt: string };

const USAGE = {
	inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
	outputTokens: { total: 5, text: 5, reasoning: undefined },
};

function textOf(content: unknown): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) return content.map((part) => (part && typeof part === "object" && "text" in part ? String(part.text) : "")).join("");

	return "";
}

/**
 * The AI SDK's mock language model answering `text` (or running `behave`),
 * recording each call's prompt in `calls`. Moderation's unit tests never
 * reach the AI Gateway.
 */
export function mockModel(answer: string | ((signal: AbortSignal | undefined) => Promise<string>)) {
	const calls: Asked[] = [];
	const model = new MockLanguageModelV4({
		doGenerate: async ({ prompt, abortSignal }) => {
			calls.push({
				system: prompt.filter((message) => message.role === "system").map((message) => textOf(message.content)).join("\n"),
				prompt: prompt.filter((message) => message.role === "user").map((message) => textOf(message.content)).join("\n"),
			});
			const text = typeof answer === "string" ? answer : await answer(abortSignal);

			return { content: [{ type: "text", text }], finishReason: { unified: "stop", raw: undefined }, usage: USAGE, warnings: [] };
		},
	});

	return { model, calls };
}

/** A structured verdict, as the model would write it. */
export const verdict = (decision: string, reason = "Because.") => JSON.stringify({ decision, reason });
