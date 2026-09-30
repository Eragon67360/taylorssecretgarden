import { describe, expect, it } from "vitest";

import { limitMessage, noteExcerpt } from "@/components/swiftter/words";

// What screen readers hear about a note: its first words (to tell one
// "tear up" from another) and, near the limit, how much room is left.

describe("noteExcerpt", () => {
	it("reads the note's text, without markup, entities decoded", () => {
		expect(noteExcerpt("<p><strong>Long</strong> live &amp; <em>ok</em></p><ul><li><p>one</p></li></ul>")).toBe("Long live & ok one");
	});

	it("cuts long notes at the length, with an ellipsis", () => {
		const excerpt = noteExcerpt(`<p>${"all too well ".repeat(10)}</p>`, 20);

		expect(excerpt).toBe("all too well all to…");
		expect(excerpt.length).toBeLessThanOrEqual(20);
	});
});

describe("limitMessage", () => {
	it("says nothing far from the limit", () => {
		expect(limitMessage(0)).toBe("");
		expect(limitMessage(799)).toBe("");
	});

	it("changes only when a threshold is crossed, not at every keystroke", () => {
		expect(limitMessage(800)).toBe("200 characters left at most.");
		expect(limitMessage(850)).toBe(limitMessage(801));
		expect(limitMessage(900)).toBe("100 characters left at most.");
		expect(limitMessage(995)).toBe("10 characters left at most.");
		expect(limitMessage(1000)).toBe("The note is full.");
	});

	it("says a note is too long past the limit", () => {
		expect(limitMessage(1001)).toMatch(/Too long/);
		expect(limitMessage(1200)).toBe(limitMessage(1001));
	});
});
