import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow } from "./checks";
import { expect, test } from "./fixtures";

// The small print: the privacy policy, the terms and the legal notice, linked
// from every page's footer and from the sign-up form.
const PAGES = [
	{ path: "/privacy", heading: "Privacy policy" },
	{ path: "/terms", heading: "Terms and community rules" },
	{ path: "/legal", heading: "Mentions légales" },
];

test.beforeEach(async ({ page }) => {
	// Nobody signs in here: the header's "is anyone signed in?" request is
	// answered locally, so these page loads add nothing to Neon Auth's request
	// count on CI's branch (it rate-limits, and a 429 is a console error).
	await page.route(/\/api\/auth\/get-session(\?|$)/, (route) => route.fulfill({ json: null }));
});

for (const { path, heading } of PAGES) {
	test.describe(path, () => {
		test(`answers 200 with its heading, and passes axe`, async ({ page }) => {
			const response = await page.goto(path);

			expect(response?.status()).toBe(200);
			await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();
			await expectNoAxeViolations(page);
		});

		test("fits a 390px phone", async ({ page }) => {
			await page.setViewportSize(PHONE);
			await page.goto(path);
			await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
			await expectNoHorizontalOverflow(page);
		});
	});
}

test("the legal notice names the publisher and the host, in French first, marked as French", async ({ page }) => {
	await page.goto("/legal");
	const french = page.locator("section#fr");

	await expect(french).toHaveAttribute("lang", "fr");
	await expect(french.getByRole("heading", { level: 3, name: "Éditeur et directeur de la publication" })).toBeVisible();
	await expect(french).toContainText("Thomas Moser");
	await expect(french).toContainText("Vercel Inc.");
	await expect(page.locator("section#en")).toContainText("Thomas Moser");
	// French comes first on the page.
	expect(await page.locator("#main section[id]").evaluateAll((sections) => sections.map(({ id }) => id))).toEqual(["fr", "en"]);
});

test("the terms state the minimum age and the automated check", async ({ page }) => {
	await page.goto("/terms");

	await expect(page.getByText("You must be 15 or older to become a Member.")).toBeVisible();
	await expect(page.getByText("An AI reads every note and reply before it is published.")).toBeVisible();
});

test("the footer links the small print on every page", async ({ page }) => {
	for (const path of ["/", "/terms"]) {
		await page.goto(path);
		const smallPrint = page.getByRole("contentinfo").getByRole("navigation", { name: "The small print" });

		for (const [name, href] of [
			["Privacy", "/privacy"],
			["Terms and community rules", "/terms"],
			["Mentions légales", "/legal"],
		])
			await expect(smallPrint.getByRole("link", { name, exact: true }), `${name} on ${path}`).toHaveAttribute("href", href);
	}
});

test("sign-up says who may join, and links the terms and the privacy policy", async ({ page }) => {
	await page.goto("/sign-up");
	const form = page.locator("#main");

	await expect(form.getByText("You must be 15 or older to become a Member.")).toBeVisible();
	await expect(form.getByRole("link", { name: "terms and community rules" })).toHaveAttribute("href", "/terms");
	await expect(form.getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/privacy");
});

test("sign-in, for Members already in, does not repeat it", async ({ page }) => {
	await page.goto("/sign-in");

	await expect(page.getByRole("heading", { level: 2, name: "Sign in to Taylor's Secret Garden" })).toBeVisible();
	await expect(page.getByText(/or older to become a Member/)).toBeHidden();
});
