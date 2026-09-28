import type { Page } from "@playwright/test";

import AxeBuilder from "@axe-core/playwright";

import { expect } from "./fixtures";

/**
 * Quality checks every page ticket enables for its route: accessibility (axe),
 * no sideways scrolling on a phone, and reduced motion honoured.
 *
 * Each check takes an optional `scope`: CSS selectors of the regions to check.
 * Without it the whole page is checked; routes not yet redesigned pass the
 * site chrome only (`CHROME`).
 */
export type Scope = string[];

/** The site header (with the Main nav) and footer, present on every page. */
export const CHROME: Scope = ["#site-header", "#site-footer"];

/** A 390px-wide phone viewport (iPhone 12-15 class). */
export const PHONE = { width: 390, height: 844 };

const WCAG_21_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** No axe violations at WCAG 2.1 AA, in the scope or the whole page. */
export async function expectNoAxeViolations(page: Page, scope?: Scope) {
	let builder = new AxeBuilder({ page }).withTags(WCAG_21_AA);

	for (const selector of scope ?? []) builder = builder.include(selector);

	const { violations } = await builder.analyze();
	const summary = violations.map(
		({ id, impact, help, nodes }) => `${id} (${impact}): ${help}\n    ${nodes.map((node) => node.target.join(" ")).join("\n    ")}`,
	);

	expect(summary, "axe WCAG 2.1 AA violations").toEqual([]);
}

/**
 * Nothing sticks out sideways. Whole page: the document is no wider than the
 * viewport. Scoped: each region fits inside the viewport and does not scroll
 * sideways itself.
 */
export async function expectNoHorizontalOverflow(page: Page, scope?: Scope) {
	const overflow = await page.evaluate((selectors) => {
		const viewport = document.documentElement.clientWidth;

		if (!selectors) {
			const width = document.documentElement.scrollWidth;

			return width > viewport ? [`document is ${width}px wide in a ${viewport}px viewport`] : [];
		}

		return selectors.flatMap((selector) => {
			const element = document.querySelector(selector);

			if (!element) return [`${selector} not found`];
			const { left, right } = element.getBoundingClientRect();
			const problems: string[] = [];

			if (left < -0.5 || right > viewport + 0.5) problems.push(`${selector} spans ${left}..${right}px in a ${viewport}px viewport`);
			if (element.scrollWidth > element.clientWidth + 0.5)
				problems.push(`${selector} scrolls sideways (${element.scrollWidth} > ${element.clientWidth})`);

			return problems;
		});
	}, scope ?? null);

	expect(overflow, "horizontal overflow").toEqual([]);
}

/**
 * With reduced motion requested, nothing moves once the page has loaded: no
 * running animations or transitions (`document.getAnimations()`) and no
 * playing video, in the scope or the whole page.
 */
export async function expectReducedMotion(page: Page, scope?: Scope) {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.reload();
	await page.waitForLoadState("load");
	// Let hydration and the first frames run: anything still going after that
	// is motion the visitor would see.
	await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

	const moving = await page.evaluate((selectors) => {
		const inScope = (node: Node | null | undefined) =>
			!!node && (!selectors || selectors.some((selector) => document.querySelector(selector)?.contains(node)));
		const describe = (node: Element) =>
			`${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}${node.classList.length ? `.${[...node.classList].slice(0, 3).join(".")}` : ""}`;

		const animations = document
			.getAnimations()
			.filter((animation) => animation.playState === "running")
			.flatMap((animation) => {
				const target = (animation.effect as KeyframeEffect | null)?.target;

				return target && inScope(target) ? [`animation on ${describe(target)}`] : [];
			});
		const videos = [...document.querySelectorAll("video")]
			.filter((video) => inScope(video) && !video.paused && !video.ended)
			.map((video) => `playing ${describe(video)}`);

		return [...animations, ...videos];
	}, scope ?? null);

	expect(moving, "motion under prefers-reduced-motion: reduce").toEqual([]);
}
