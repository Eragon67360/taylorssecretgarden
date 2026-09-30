import { describe, expect, it } from "vitest";

import { INDEXING_BAR_CHARACTERS, meetsIndexingBar } from "@/service/swiftter";

// A thread is indexed (and in the sitemap) only when its first Post says
// enough on its own, or someone answered it: a lone one-liner is a thin page.
describe("the indexing bar for Swiftter threads", () => {
	const text = (characters: number) => `<p>${"a".repeat(characters)}</p>`;

	it("a short Post nobody answered stays out", () => {
		expect(meetsIndexingBar("<p>so good ✨</p>", 0)).toBe(false);
		expect(meetsIndexingBar(text(INDEXING_BAR_CHARACTERS - 1), 0)).toBe(false);
	});

	it("a Post of 140 visible characters is in", () => {
		expect(meetsIndexingBar(text(INDEXING_BAR_CHARACTERS), 0)).toBe(true);
	});

	it("a short Post with a public reply is in", () => {
		expect(meetsIndexingBar("<p>so good ✨</p>", 1)).toBe(true);
	});

	it("counts what a reader sees: no markup, runs of spaces as one, an emoji as one character", () => {
		const padded = `<p><strong>${"a".repeat(60)}</strong></p><p>${"   ".repeat(20)}</p><ul><li><p>${"b".repeat(60)}</p></li></ul>`;

		expect(meetsIndexingBar(padded, 0)).toBe(false);
		expect(meetsIndexingBar(`<p>${"🌲".repeat(INDEXING_BAR_CHARACTERS - 1)}</p>`, 0)).toBe(false);
		expect(meetsIndexingBar(`<p>${"🌲".repeat(INDEXING_BAR_CHARACTERS)}</p>`, 0)).toBe(true);
	});
});
