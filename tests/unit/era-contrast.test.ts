import { describe, expect, it, vi } from "vitest";

import { contrastRatio } from "@/lib/contrast";

// The Era faces are next/font modules, which only load in a Next build.
vi.mock("@/config/era-fonts", () => ({ eraFontFamilies: new Proxy({}, { get: (_, slug) => `${String(slug)}, serif` }) }));

const { ERAS } = await import("@/lib/eras");

/** WCAG 1.4.11: what shows a control's state, 3:1 against what is next to it. */
const NON_TEXT = 3;

describe("contrastRatio", () => {
	it("measures black on white as 21:1 and a colour on itself as 1:1", () => {
		expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
		expect(contrastRatio("#fff", "#FFFFFF")).toBe(1);
	});

	it("does not depend on the order", () => {
		expect(contrastRatio("#7E2A37", "#F3EADB")).toBeCloseTo(contrastRatio("#F3EADB", "#7E2A37"), 10);
	});

	it("finds the Era accents the audit measured too faint for a control", () => {
		// The old selected-chip outline (on paper) and progress fill (on the line-coloured track).
		const accentAgainst = (slug: string) => {
			const look = ERAS.find((era) => era.slug === slug)!;

			return Math.min(contrastRatio(look.accent, look.paper), contrastRatio(look.accent, look.line));
		};

		for (const slug of ["fearless", "lover", "showgirl"]) expect(accentAgainst(slug), slug).toBeLessThan(NON_TEXT);
	});
});

// The music journal's state marks, in every Era (components/music): the
// selected Version chip's outline sits on the page's paper around the
// card-coloured chip, with an ink tick on it; the preview's progress fill runs
// along a track in the line colour on the tracklist's card. The Era accent
// failed there on Fearless, Lover and Showgirl, so they are drawn in ink.
describe.each(ERAS.map((look) => [look.name, look] as const))("%s", (_, look) => {
	it("the selected Version chip's ink outline stands out from the paper and the chip", () => {
		expect(contrastRatio(look.ink, look.paper)).toBeGreaterThanOrEqual(NON_TEXT);
		expect(contrastRatio(look.ink, look.card)).toBeGreaterThanOrEqual(NON_TEXT);
	});

	it("the selected chip's tick, card on an ink disc, reads", () => {
		expect(contrastRatio(look.card, look.ink)).toBeGreaterThanOrEqual(NON_TEXT);
	});

	it("the preview's ink progress fill stands out from its track and the card", () => {
		expect(contrastRatio(look.ink, look.line)).toBeGreaterThanOrEqual(NON_TEXT);
		expect(contrastRatio(look.ink, look.card)).toBeGreaterThanOrEqual(NON_TEXT);
	});
});
