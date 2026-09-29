import type { Page } from "@playwright/test";

import { existsSync } from "node:fs";

import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow, expectReducedMotion } from "./checks";
import { expect, test } from "./fixtures";
import { BOTID_HUMAN, MEMBER_STATE, newTestMember, readTestMember, writeGuard } from "./member";

// Swiftter against a real (throwaway) Neon branch: CI creates one per run,
// migrates and seeds it before the suite runs (`npm run db:migrate && npm run db:seed`).
const FEED = "/api/swiftter/posts";

type FeedPost = {
	id: string;
	content: string;
	isDemo: boolean;
	createdAt: string;
	author: { displayName: string; username: string | null; avatarUrl: string | null };
};

/** Opens Swiftter as the test Member (signed up by e2e/member.setup.ts). */
async function signIn(page: Page) {
	await page.goto("/swiftter");
	await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

const feedPosts = (page: Page) => page.getByRole("feed", { name: "Posts" }).getByRole("article");

/** Serves the feed from a stub instead of the database, for this page only. */
async function stubFeed(page: Page, body: string) {
	await page.route(FEED, (route) =>
		route.request().method() === "GET" ? route.fulfill({ status: 200, contentType: "application/json", body }) : route.fallback(),
	);
}

const stubPost = (id: string, content: string, createdAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()): FeedPost => ({
	id,
	content,
	isDemo: false,
	createdAt,
	author: { displayName: "Stub Member", username: "stub", avatarUrl: null },
});

/** Relative dates as the feed writes them ("just now", "3 days ago", "last week"). */
const RELATIVE_DATE = /^(just now|yesterday|last (week|month|year)|\d+ (minutes?|hours?|days?|weeks?|months?|years?) ago)$/;

// Publishing tests check "newest first", so this file's tests run one after
// another in a single worker.
test.describe.configure({ mode: "default" });

test.describe("Swiftter, signed out", () => {
	test("the feed route is public and lists the demo Posts newest first", async ({ request }) => {
		const response = await request.get(FEED);

		expect(response.status()).toBe(200);
		const { posts } = (await response.json()) as { posts: FeedPost[] };

		expect(posts.filter((post) => post.isDemo).length).toBeGreaterThanOrEqual(10);
		expect(posts.map((post) => post.author.displayName)).toEqual(
			expect.arrayContaining(["Juniper Wells", "Marcus Hale", "Inès Carvalho"]),
		);

		const times = posts.map((post) => Date.parse(post.createdAt));

		expect(times).toEqual([...times].sort((a, b) => b - a));
	});

	test("the Swiftter page shows the demo Posts with their Members", async ({ page }) => {
		const response = await page.goto("/swiftter");

		expect(response?.status()).toBe(200);
		await expect(page.getByRole("heading", { name: "Swiftter", level: 1 })).toBeVisible();

		const post = feedPosts(page).filter({ hasText: "cardigan" }).first();

		await expect(post).toBeVisible();
		await expect(post.getByText("Juniper Wells")).toBeVisible();
		await expect(post.getByText("@juniper_in_cardigan")).toBeVisible();
		await expect(post.getByText("Demo", { exact: true })).toBeVisible();
		expect(await feedPosts(page).count()).toBeGreaterThanOrEqual(10);
	});

	test("each Post shows when it was published as a relative date", async ({ page }) => {
		await page.goto("/swiftter");

		const dates = feedPosts(page).locator("time");

		await expect(dates.first()).toBeVisible();
		for (const date of (await dates.all()).slice(0, 5)) {
			await expect(date).toHaveText(RELATIVE_DATE);
			expect(Date.parse((await date.getAttribute("datetime")) ?? "")).not.toBeNaN();
		}
	});

	test("Posts render their formatting: Tiptap lists, old Quill bullet lists, links", async ({ page }) => {
		await stubFeed(
			page,
			JSON.stringify({
				posts: [
					stubPost(
						"tiptap",
						'<p><strong>bold</strong> <em>italic</em> <a href="https://example.com">a link</a></p><ul><li><p>tiptap bullet</p></li></ul><ol><li><p>tiptap number</p></li></ol>',
					),
					stubPost("quill", '<ol><li data-list="bullet">quill bullet</li><li data-list="ordered">quill number</li></ol>'),
				],
			}),
		);
		await page.goto("/swiftter");

		const listStyle = (text: string) =>
			feedPosts(page)
				.locator("li", { hasText: text })
				.evaluate((item) => getComputedStyle(item).listStyleType);

		await expect(feedPosts(page)).toHaveCount(2);
		expect(await listStyle("tiptap bullet")).toBe("disc");
		expect(await listStyle("tiptap number")).toBe("decimal");
		expect(await listStyle("quill bullet")).toBe("disc");
		expect(await listStyle("quill number")).toBe("decimal");
		await expect(feedPosts(page).locator("strong", { hasText: "bold" })).toBeVisible();
		await expect(feedPosts(page).locator("em", { hasText: "italic" })).toBeVisible();
		await expect(feedPosts(page).getByRole("link", { name: "a link" })).toHaveAttribute("href", "https://example.com");
	});

	test("an empty feed says so, in the journal's style", async ({ page }) => {
		await stubFeed(page, JSON.stringify({ posts: [] }));
		await page.goto("/swiftter");

		await expect(page.getByText("No notes passed yet")).toBeVisible();
		await expect(feedPosts(page)).toHaveCount(0);
	});

	test("a feed that cannot be read shows an error with a way to try again", async ({ page }) => {
		// A malformed answer rather than a 500: the browser logs failed requests
		// as console errors, which the fixture rightly rejects.
		await stubFeed(page, "{}");
		await page.goto("/swiftter");

		await expect(page.getByText("can't reach its Posts")).toBeVisible();
		await page.unroute(FEED);
		await stubFeed(page, JSON.stringify({ posts: [stubPost("back", "<p>back again</p>")] }));
		await page.getByRole("button", { name: "Try again" }).click();
		await expect(feedPosts(page).first()).toContainText("back again");
	});

	test("publishing a Post while signed out is rejected with 401", async ({ request }) => {
		const content = `<p>anonymous ${Date.now()}</p>`;
		const response = await request.post(FEED, { data: { content } });

		expect(response.status()).toBe(401);

		const { posts } = (await (await request.get(FEED)).json()) as { posts: FeedPost[] };

		expect(posts.some((post) => post.content.includes(content))).toBe(false);
	});

	test("visitors are asked to sign the guestbook, which leads to sign-in", async ({ page }) => {
		await page.goto("/swiftter");

		const prompt = page.getByRole("link", { name: /sign the guestbook to pass a note/i });

		await expect(prompt).toBeVisible();
		await expect(page.getByRole("textbox", { name: "Write a Post" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Post", exact: true })).toHaveCount(0);

		await prompt.click();
		await expect(page).toHaveURL(/\/sign-in/);
	});

	test("passes axe (WCAG 2.1 AA)", async ({ page }) => {
		await page.goto("/swiftter");
		await expect(feedPosts(page).first()).toBeVisible();
		await expectNoAxeViolations(page);
	});

	test("fits a 390px phone", async ({ page }) => {
		await page.setViewportSize(PHONE);
		await page.goto("/swiftter");
		await expect(feedPosts(page).first()).toBeVisible();
		await expectNoHorizontalOverflow(page);
	});

	test("is still under reduced motion", async ({ page }) => {
		await page.goto("/swiftter");
		await expectReducedMotion(page);
	});
});

// These tests publish Posts, so they only run on a disposable Neon branch,
// never on the real database (e2e/member.ts), as the test Member.
test.describe("Swiftter, signed in", () => {
	test.skip(!!writeGuard(), writeGuard() ?? "");
	// Checked when each test runs: the setup project signs the Member up first.
	test.skip(() => !readTestMember(), "The setup project signs up the test Member");
	test.use({ storageState: async ({}, provide) => provide(existsSync(MEMBER_STATE) ? MEMBER_STATE : undefined) });

	test("a Member publishes a Post and it appears first in the feed", async ({ page }) => {
		await signIn(page);

		const text = `Long live, from the test Member ${Date.now()}`;
		const editor = page.getByRole("textbox", { name: "Write a Post" });

		await editor.click();
		await editor.pressSequentially(text);
		await page.getByRole("button", { name: "Post", exact: true }).click();

		const first = feedPosts(page).first();

		await expect(first).toContainText(text);
		await expect(first.getByText(readTestMember()!.name)).toBeVisible();

		// Still first after a reload, so it was stored, not just shown.
		await page.reload();
		await expect(feedPosts(page).first()).toContainText(text);
	});

	test("a Post containing a script is stored and rendered without running it", async ({ page }) => {
		await signIn(page);

		const marker = `scripted ${Date.now()}`;
		const response = await page.request.post(FEED, {
			headers: BOTID_HUMAN,
			data: {
				content: `<p>${marker}</p><script>window.__swiftterPwned = true</script><svg onload="window.__swiftterPwned = true"></svg>`,
			},
		});

		expect(response.status()).toBe(201);
		const { post } = (await response.json()) as { post: FeedPost };

		expect(post.content).toContain(marker);
		expect(post.content).not.toMatch(/<script|onload/i);

		await page.reload();
		const first = feedPosts(page).first();

		await expect(first).toContainText(marker);
		await expect(first.locator("script")).toHaveCount(0);
		expect(await page.evaluate(() => (window as { __swiftterPwned?: boolean }).__swiftterPwned)).toBeUndefined();
	});

	test("a Post with nothing left after sanitising is rejected with 400", async ({ page }) => {
		await signIn(page);

		const response = await page.request.post(FEED, { headers: BOTID_HUMAN, data: { content: "<script>alert(1)</script><p><br></p>" } });

		expect(response.status()).toBe(400);
	});

	test("a publish request without BotID's token is refused with 403 and nothing is stored", async ({ page }) => {
		await signIn(page);

		const content = `<p>scripted bot ${Date.now()}</p>`;
		const response = await page.request.post(FEED, { data: { content } });

		expect(response.status()).toBe(403);

		const { posts } = (await (await page.request.get(FEED)).json()) as { posts: FeedPost[] };

		expect(posts.some((post) => post.content.includes(content))).toBe(false);
	});

	test("the composer's formatting (bold, italic, lists, link) is published as HTML", async ({ page }) => {
		await signIn(page);

		const marker = `formatted ${Date.now()}`;
		const editor = page.getByRole("textbox", { name: "Write a Post" });
		const toolbar = page.getByRole("group", { name: "Formatting" });

		await editor.click();
		await toolbar.getByRole("button", { name: "Bold" }).click();
		await editor.pressSequentially("loud");
		await toolbar.getByRole("button", { name: "Bold" }).click();
		await editor.pressSequentially(" ");
		await toolbar.getByRole("button", { name: "Italic" }).click();
		await editor.pressSequentially(marker);
		await toolbar.getByRole("button", { name: "Italic" }).click();
		await editor.press("Enter");
		await toolbar.getByRole("button", { name: "Bullet list" }).click();
		await editor.pressSequentially("first bullet");
		await editor.press("Enter");
		await editor.press("Enter");
		await toolbar.getByRole("button", { name: "Numbered list" }).click();
		await editor.pressSequentially("first number");
		await editor.press("Enter");
		await editor.press("Enter");
		await editor.pressSequentially("my link");
		await editor.press("Shift+Home");
		await toolbar.getByRole("button", { name: "Link" }).click();
		await page.getByRole("textbox", { name: "Link address" }).fill("https://example.com/eras");
		await page.getByRole("button", { name: "Add link" }).click();

		const published = page.waitForResponse((response) => response.url().endsWith(FEED) && response.request().method() === "POST");

		await page.getByRole("button", { name: "Post", exact: true }).click();
		const { post } = (await (await published).json()) as { post: FeedPost };

		expect(post.content).toContain("<strong>loud</strong>");
		expect(post.content).toContain(`<em>${marker}</em>`);
		expect(post.content).toMatch(/<ul><li><p>first bullet<\/p><\/li><\/ul>/);
		expect(post.content).toMatch(/<ol><li><p>first number<\/p><\/li><\/ol>/);
		expect(post.content).toContain('href="https://example.com/eras"');

		const first = feedPosts(page).first();

		await expect(first).toContainText(marker);
		expect(await first.locator("li", { hasText: "first bullet" }).evaluate((item) => getComputedStyle(item).listStyleType)).toBe("disc");
		await expect(first.getByRole("link", { name: "my link" })).toHaveAttribute("href", "https://example.com/eras");
		// The composer is empty again, ready for the next note.
		await expect(editor).toHaveText("");
	});

	test("passes axe, fits a phone and is still under reduced motion", async ({ page }) => {
		await signIn(page);
		await expect(page.getByRole("textbox", { name: "Write a Post" })).toBeVisible();
		await expectNoAxeViolations(page);

		await page.setViewportSize(PHONE);
		await expectNoHorizontalOverflow(page);

		await expectReducedMotion(page);
	});
});

// A Member may pass 5 notes in 10 minutes. Its own fresh Member, so the Posts
// the other tests publish as the shared test Member don't count.
test.describe("Swiftter, posting limit", () => {
	test.skip(!!writeGuard(), writeGuard() ?? "");
	// The browser logs the refused 6th Post as a failed request.
	test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of 429/] });

	test("the 6th Post within 10 minutes is refused with 429, and the composer keeps it", async ({ page }) => {
		const member = newTestMember();

		await page.goto("/sign-up");
		await page.getByRole("textbox", { name: "Name" }).fill("Prolific Swiftie");
		await page.getByRole("textbox", { name: "Email" }).fill(member.email);
		await page.getByLabel("Password").fill(member.password);
		await page.getByRole("button", { name: "Sign the guestbook" }).click();
		await expect(page.getByText("writing as Prolific Swiftie")).toBeVisible();

		const stamp = Date.now();

		for (let count = 1; count <= 5; count++) {
			const response = await page.request.post(FEED, { headers: BOTID_HUMAN, data: { content: `<p>note ${count} of 5, ${stamp}</p>` } });

			expect(response.status(), `Post ${count}`).toBe(201);
		}

		const refused = await page.request.post(FEED, { headers: BOTID_HUMAN, data: { content: `<p>one too many, ${stamp}</p>` } });

		expect(refused.status()).toBe(429);
		const retryAfter = Number(refused.headers()["retry-after"]);

		expect(retryAfter).toBeGreaterThan(0);
		expect(retryAfter).toBeLessThanOrEqual(600);
		expect(((await refused.json()) as { error: string }).error).toMatch(/10 minutes/);

		// The same refusal from the composer: written on the note, and the text stays.
		const text = `still one too many, ${stamp}`;
		const editor = page.getByRole("textbox", { name: "Write a Post" });

		await editor.click();
		await editor.pressSequentially(text);
		await page.getByRole("button", { name: "Post", exact: true }).click();

		await expect(page.getByRole("form", { name: "Pass a note" }).getByRole("alert")).toContainText(/10 minutes/);
		await expect(editor).toHaveText(text);
		await expect(feedPosts(page).filter({ hasText: text })).toHaveCount(0);
		await expectNoAxeViolations(page);

		// Nothing more was stored.
		const { posts } = (await (await page.request.get(FEED)).json()) as { posts: FeedPost[] };

		expect(posts.filter((post) => post.content.includes(String(stamp)))).toHaveLength(5);
	});
});

test("the old /forum address permanently redirects to /swiftter", async ({ page, request }) => {
	const response = await request.get("/forum", { maxRedirects: 0 });

	expect(response.status()).toBe(308);
	expect(response.headers()["location"]).toBe("/swiftter");

	await page.goto("/forum");
	await expect(page).toHaveURL("/swiftter");
});
