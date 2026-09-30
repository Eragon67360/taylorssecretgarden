import type { APIRequestContext, Browser, Page } from "@playwright/test";

import { existsSync } from "node:fs";
import path from "node:path";

import { seedId } from "../scripts/seed-data";

import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow, expectReducedMotion } from "./checks";
import { expect, test } from "./fixtures";
import { BOTID_HUMAN, MEMBER_DIR, MEMBER_STATE, newTestMember, readTestMember, writeGuard } from "./member";

// Swiftter against a real (throwaway) Neon branch: CI creates one per run,
// migrates it and loads the demo content and the development fixtures
// (`npm run db:migrate && npm run db:seed && npm run seed`) before the suite runs.
const FEED = "/api/swiftter/posts";

type Author = { id: string; displayName: string; username: string | null; avatarUrl: string | null };
type FeedPost = { id: string; content: string; isDemo: boolean; createdAt: string; publishedAt: string; author: Author; replyCount: number; reshareCount: number };
type FeedItem = { kind: "post"; key: string; post: FeedPost } | { kind: "reshare"; key: string; resharedAt: string; resharedBy: Author; post: FeedPost | { id: string; tornUp: true } };
type FeedPage = { items: FeedItem[]; nextCursor: string | null };
type HeldNote = { id: string; content: string; status: "pending" | "blocked"; category: string | null; reason: string | null; attempts: number; canCheckAgain: boolean };

/** Every entry of the public feed, following its pages to the end. */
async function allItems(request: APIRequestContext): Promise<FeedItem[]> {
	const items: FeedItem[] = [];
	let cursor: string | null = null;

	do {
		const response = await request.get(cursor ? `${FEED}?cursor=${encodeURIComponent(cursor)}` : FEED);

		expect(response.status()).toBe(200);
		const page = (await response.json()) as FeedPage;

		items.push(...page.items);
		cursor = page.nextCursor;
	} while (cursor);

	return items;
}

/** Whether any public note in the feed contains this text. */
const isPublic = async (request: APIRequestContext, text: string) =>
	(await allItems(request)).some((item) => !("tornUp" in item.post) && item.post.content.includes(text));

/** The signed-in Member's own view: held notes and reshares. */
const mine = async (request: APIRequestContext) => (await (await request.get("/api/swiftter/me")).json()) as { held: HeldNote[]; reshared: string[] };

/** Writes a note through the API, as the page's Member (BotID's token included). */
const write = (page: Page, content: string, parentId?: string) =>
	page.request.post(FEED, { headers: BOTID_HUMAN, data: parentId ? { content, parentId } : { content } });

/** Opens Swiftter as the test Member (signed up by e2e/member.setup.ts). */
async function signIn(page: Page) {
	await page.goto("/swiftter");
	await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

/**
 * Signs a fresh Member up through the guestbook form, in this page's context,
 * and lands on Swiftter. Neon Auth limits sign-ups in a burst: when the form
 * says so, it waits and tries again, as a person would.
 */
async function signUpFresh(page: Page, name: string) {
	const member = newTestMember();

	await page.goto("/sign-up");
	await page.getByRole("textbox", { name: "Name" }).fill(name);
	await page.getByRole("textbox", { name: "Email" }).fill(member.email);
	await page.getByLabel("Password").fill(member.password);

	const signedIn = page.getByText(`writing as ${name}`);
	const tooMany = page.getByText(/Too many tries in a row/);

	for (let attempt = 1; ; attempt++) {
		await page.getByRole("button", { name: "Sign the guestbook" }).click();
		// Signed up and on Swiftter, but the page asked for the session too early: look again.
		const settled = await signedIn
			.or(tooMany)
			.waitFor({ timeout: 10_000 })
			.then(() => true)
			.catch(() => false);

		if (!settled && page.url().endsWith("/swiftter")) await page.reload();
		await expect(signedIn.or(tooMany))
			.toBeVisible({ timeout: 20_000 })
			.catch(async (error: Error) => {
				const alerts = await page.getByRole("alert").allTextContents();

				await page.screenshot({ path: `test-results/sign-up-${name.replace(/\W+/g, "-")}.png` });

				throw new Error(`Signing up ${name} did not finish at ${page.url()}; alerts: ${JSON.stringify(alerts)}`, { cause: error });
			});
		if (await signedIn.isVisible()) return;
		if (attempt === 4) throw new Error("Neon Auth kept refusing sign-ups (rate limit)");
		await page.waitForTimeout(15_000);
	}
}

/**
 * A Member for one group of tests, signed up once (in `beforeAll`) and reused
 * through its saved session: fewer sign-ups, so Neon Auth's rate limit is not
 * reached. Returns the file its session is saved in.
 */
function groupMember(key: string, name: string) {
	const file = path.join(MEMBER_DIR, `${key}-state.json`);

	test.beforeAll(async ({ browser }) => {
		test.setTimeout(120_000);
		// Explicitly signed out: hand-made contexts otherwise inherit the group's `storageState`.
		const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });

		await signUpFresh(await context.newPage(), name);
		await context.storageState({ path: file });
		await context.close();
	});

	return file;
}

/** A page signed in as the Member whose session is saved in `state`, in its own browser context. */
async function openAs(browser: Browser, state: string) {
	const context = await browser.newContext({ storageState: state });
	const page = await context.newPage();

	return { page, close: () => context.close() };
}

const feedPosts = (page: Page) => page.getByRole("feed", { name: "Notes" }).getByRole("article");

/** A request for a page of the feed after the first. */
const OLDER_PAGE = (url: URL) => url.pathname === FEED && url.searchParams.has("cursor");

/**
 * Serves the feed's older pages ("older notes") from a stub instead of the
 * database, for this page only. The first page is rendered by the server.
 */
async function stubOlderNotes(page: Page, body: string) {
	await page.route(OLDER_PAGE, (route) =>
		route.request().method() === "GET" ? route.fulfill({ status: 200, contentType: "application/json", body }) : route.fallback(),
	);
}

const stubItem = (id: string, content: string, at = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()): FeedItem => ({
	kind: "post",
	key: id,
	post: { id, content, isDemo: false, createdAt: at, publishedAt: at, replyCount: 0, reshareCount: 0, author: { id: "stub-member", displayName: "Stub Member", username: "stub", avatarUrl: null } },
});

/** Relative dates as the feed writes them ("just now", "3 days ago", "last week"). */
const RELATIVE_DATE = /^(just now|yesterday|last (week|month|year)|\d+ (minutes?|hours?|days?|weeks?|months?|years?) ago)$/;

/** Development fixtures (scripts/seed-data.ts) the signed-out tests read. */
const SEEDED = {
	deepThread: seedId("p", 1),
	deepestReply: seedId("r", 8),
	rtl: seedId("p", 48),
	blocked: seedId("p", 50),
	tornUp: seedId("p", 53),
};

// Publishing tests check "newest first", so this file's tests run one after
// another in a single worker.
test.describe.configure({ mode: "default" });

test.describe("Swiftter, signed out", () => {
	test("the feed route is public, newest first, and pages without repeating or skipping", async ({ request }) => {
		const items = await allItems(request);
		const posts = items.flatMap((item) => (item.kind === "post" ? [item.post] : []));

		expect(posts.filter((post) => post.isDemo).length).toBeGreaterThanOrEqual(10);
		expect(posts.map((post) => post.author.displayName)).toEqual(expect.arrayContaining(["Juniper Wells", "Marcus Hale", "Inès Carvalho"]));
		// More than one page, with the fixtures loaded.
		expect(items.length).toBeGreaterThan(40);
		expect(new Set(items.map((item) => item.key)).size).toBe(items.length);

		const times = items.map((item) => Date.parse(item.kind === "reshare" ? item.resharedAt : item.post.publishedAt));

		expect(times).toEqual([...times].sort((a, b) => b - a));
	});

	test("a visitor's \"am I signed in?\" is answered here, without asking Neon Auth", async ({ request }) => {
		const response = await request.get("/api/auth/get-session");

		expect(response.status()).toBe(200);
		expect(await response.json()).toBeNull();
		expect(response.headers()["cache-control"]).toBe("private, no-store");
	});

	test("a malformed feed cursor is a 400, not a crash", async ({ request }) => {
		expect((await request.get(`${FEED}?cursor=not-a-cursor`)).status()).toBe(400);
	});

	test("the Swiftter page shows the demo Posts with their Members, older ones a page further", async ({ page }) => {
		const response = await page.goto("/swiftter");

		expect(response?.status()).toBe(200);
		await expect(page.getByRole("heading", { name: "Swiftter", level: 1 })).toBeVisible();

		const cardigan = feedPosts(page).filter({ hasText: "cardigan" }).first();
		const older = page.getByRole("button", { name: /older notes/ });

		// Newer notes may push it past the first page: turn pages until it shows.
		// A page has turned once the feed holds more notes than before the click
		// (a next page is never empty). Waiting on "the button or the last note"
		// instead matched both once the page had loaded: a strict-mode failure.
		for (let turn = 0; turn < 12 && !(await cardigan.isVisible()); turn++) {
			const before = await feedPosts(page).count();

			await older.click();
			await expect.poll(() => feedPosts(page).count()).toBeGreaterThan(before);
		}
		await expect(cardigan).toBeVisible();
		await expect(cardigan.getByText("Juniper Wells", { exact: true })).toBeVisible();
		await expect(cardigan.getByText("@juniper_in_cardigan")).toBeVisible();
		await expect(cardigan.getByText("Demo", { exact: true })).toBeVisible();
		expect(await feedPosts(page).count()).toBeGreaterThanOrEqual(10);
	});

	test("older notes load a page at a time, announced, and none repeats", async ({ page }) => {
		await page.goto("/swiftter");
		await expect(feedPosts(page).first()).toBeVisible();
		const first = await feedPosts(page).count();

		expect(first).toBe(20);
		// A feed: each note says where it sits; how many there are is unknown while older notes remain.
		await expect(feedPosts(page).nth(1)).toHaveAttribute("aria-posinset", "2");
		await expect(feedPosts(page).nth(1)).toHaveAttribute("aria-setsize", "-1");
		await page.getByRole("button", { name: /older notes/ }).focus();
		await page.keyboard.press("Enter");
		await expect(page.getByRole("status").filter({ hasText: /more notes loaded/ })).toBeAttached();
		await expect.poll(() => feedPosts(page).count()).toBeGreaterThan(first);
		// The keyboard carries on at the first new note.
		await expect(feedPosts(page).nth(first)).toBeFocused();
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

	test("the first page of notes, and links to their threads, are in the page's HTML (no JavaScript needed)", async ({ request }) => {
		const feed = (await (await request.get(FEED)).json()) as FeedPage;
		const html = await (await request.get("/swiftter")).text();
		// Other runs may write to the same database meanwhile: most of the page is still the same notes.
		const shown = feed.items.flatMap((item) =>
			item.kind === "post" && html.includes(item.post.content) && html.includes(`href="/swiftter/p/${item.post.id}"`) ? [item.post.id] : [],
		);

		expect(shown.length).toBeGreaterThanOrEqual(5);
		expect(html).not.toMatch(/Loading (Posts|notes)/);
	});

	test("the feed's first page may be cached by the CDN; older pages and the Member's own view may not", async ({ request }) => {
		const first = await request.get(FEED);

		expect(first.headers()["cache-control"]).toBe("public, s-maxage=15, stale-while-revalidate=60");
		expect(Object.keys((await first.json()) as object).toSorted()).toEqual(["items", "nextCursor"]);
		const { nextCursor } = (await first.json()) as FeedPage;

		expect((await request.get(`${FEED}?cursor=${encodeURIComponent(nextCursor!)}`)).headers()["cache-control"] ?? "").not.toMatch(/public/);
		expect((await request.get("/api/swiftter/me")).headers()["cache-control"]).toBe("private, no-store");
	});

	test("Posts render their formatting: Tiptap lists, old Quill bullet lists, links", async ({ page }) => {
		await stubOlderNotes(
			page,
			JSON.stringify({
				items: [
					stubItem("tiptap", '<p><strong>bold</strong> <em>italic</em> <a href="https://example.com">a link</a></p><ul><li><p>tiptap bullet</p></li></ul><ol><li><p>tiptap number</p></li></ol>'),
					stubItem("quill", '<ol><li data-list="bullet">quill bullet</li><li data-list="ordered">quill number</li></ol>'),
				],
				nextCursor: null,
			}),
		);
		await page.goto("/swiftter");
		await page.getByRole("button", { name: /older notes/ }).click();

		const listStyle = (text: string) =>
			feedPosts(page)
				.locator("li", { hasText: text })
				.evaluate((item) => getComputedStyle(item).listStyleType);

		await expect(feedPosts(page).filter({ hasText: "tiptap bullet" })).toHaveCount(1);
		expect(await listStyle("tiptap bullet")).toBe("disc");
		expect(await listStyle("tiptap number")).toBe("decimal");
		expect(await listStyle("quill bullet")).toBe("disc");
		expect(await listStyle("quill number")).toBe("decimal");
		await expect(feedPosts(page).locator("strong", { hasText: "bold" })).toBeVisible();
		await expect(feedPosts(page).locator("em", { hasText: "italic" })).toBeVisible();
		await expect(feedPosts(page).getByRole("link", { name: "a link" })).toHaveAttribute("href", "https://example.com");
	});

	test("older notes that cannot be read say so, with a way to try again", async ({ page }) => {
		// A malformed answer rather than a 500: the browser logs failed requests
		// as console errors, which the fixture rightly rejects.
		await stubOlderNotes(page, "{}");
		await page.goto("/swiftter");
		const older = page.getByRole("button", { name: /older notes/ });

		await older.click();
		await expect(page.getByRole("alert").filter({ hasText: "The next notes couldn't be read just now." })).toBeVisible();
		await page.unroute(OLDER_PAGE);
		await stubOlderNotes(page, JSON.stringify({ items: [stubItem("back", "<p>back again</p>")], nextCursor: null }));
		await page.getByRole("button", { name: /try again: older notes/ }).click();
		await expect(feedPosts(page).last()).toContainText("back again");
		await expect(feedPosts(page).last()).toBeFocused();
		await expect(page.getByRole("alert").filter({ hasText: "couldn't be read" })).toHaveCount(0);
	});

	test("publishing a Post while signed out is rejected with 401 and nothing is stored", async ({ request }) => {
		const content = `<p>anonymous ${Date.now()}</p>`;
		const response = await request.post(FEED, { data: { content } });

		expect(response.status()).toBe(401);
		expect(await isPublic(request, content)).toBe(false);
	});

	test("every other write route is 401 signed out, and /api/swiftter/me too", async ({ request }) => {
		const id = SEEDED.deepThread;

		expect((await request.delete(`${FEED}/${id}`)).status()).toBe(401);
		expect((await request.post(`${FEED}/${id}/reshare`)).status()).toBe(401);
		expect((await request.delete(`${FEED}/${id}/reshare`)).status()).toBe(401);
		expect((await request.post(`${FEED}/${id}/check`)).status()).toBe(401);
		expect((await request.get("/api/swiftter/me")).status()).toBe(401);
		expect(await isPublic(request, "seed note 1)")).toBe(true);
	});

	test("writes from another site, or not in JSON, are refused before anything else", async ({ request }) => {
		const content = { content: `<p>forged ${Date.now()}</p>` };

		expect((await request.post(FEED, { headers: { ...BOTID_HUMAN, Origin: "https://evil.example" }, data: content })).status()).toBe(403);
		expect((await request.post(FEED, { headers: { ...BOTID_HUMAN, "Sec-Fetch-Site": "cross-site" }, data: content })).status()).toBe(403);
		expect((await request.delete(`${FEED}/${SEEDED.deepThread}`, { headers: { Origin: "https://evil.example" } })).status()).toBe(403);
		expect((await request.post(FEED, { headers: { ...BOTID_HUMAN, "Content-Type": "text/plain" }, data: JSON.stringify(content) })).status()).toBe(415);
	});

	test("visitors can read and follow threads, but see no way to write", async ({ page }) => {
		await page.goto("/swiftter");
		await expect(feedPosts(page).first()).toBeVisible();
		await expect(page.getByRole("button", { name: /tear up|reshare/ })).toHaveCount(0);

		// The first note with a thread (a torn-up note, reshared, has none).
		await feedPosts(page).getByRole("link", { name: /^(reply|\d+ repl)/ }).first().click();
		await expect(page).toHaveURL(/\/swiftter\/p\//);
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		await expect(page.getByRole("button", { name: /^reply/ })).toHaveCount(0);
		const signIn = page.getByRole("link", { name: /sign the guestbook to reply/ });

		await expect(signIn).toHaveAttribute("href", /\/sign-in\?redirect_url=%2Fswiftter%2Fp%2F/);
	});

	test("visitors are asked to sign the guestbook, which leads to sign-in", async ({ page }) => {
		await page.goto("/swiftter");

		const prompt = page.getByRole("link", { name: /sign the guestbook to pass a note/i });

		await expect(prompt).toBeVisible();
		await expect(page.getByRole("textbox", { name: "Write a note" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Pass note", exact: true })).toHaveCount(0);

		await prompt.click();
		await expect(page).toHaveURL(/\/sign-in/);
	});

	test("passes axe (WCAG 2.2 AA)", async ({ page }) => {
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

test.describe("Swiftter threads, signed out", () => {
	// A refused note's page is a 404, which the browser logs.
	test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of 404/] });

	test("a deep thread renders nested, deepest replies saying whom they answer, with structured data", async ({ page }) => {
		const response = await page.goto(`/swiftter/p/${SEEDED.deepThread}`);

		expect(response?.status()).toBe(200);
		await expect(page.getByRole("heading", { level: 1, name: "A note from Wren Holloway" })).toBeVisible();
		await expect(page.getByRole("heading", { level: 2, name: "8 replies" })).toBeVisible();
		await expect(page.getByText("Reply 8 in the deep thread")).toBeVisible();
		await expect(page.getByText(/replying to/).first()).toBeVisible();
		await expect(page.locator("ol ol ol ol")).not.toHaveCount(0);

		const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
		const structured = blocks.map((block) => JSON.parse(block) as Record<string, unknown>).find((data) => data["@type"] === "DiscussionForumPosting");

		expect(structured).toMatchObject({ "@context": "https://schema.org", "@type": "DiscussionForumPosting", commentCount: 8 });
		await expectNoAxeViolations(page);
		await page.setViewportSize(PHONE);
		await expectNoHorizontalOverflow(page);
	});

	test("a link to a reply opens its thread", async ({ page }) => {
		await page.goto(`/swiftter/p/${SEEDED.deepestReply}`);
		await expect(page.getByRole("heading", { level: 1, name: "A note from Wren Holloway" })).toBeVisible();
		await expect(page.locator(`#note-${SEEDED.deepestReply}`)).toBeVisible();
	});

	test("right-to-left notes take their own direction per paragraph", async ({ page }) => {
		await page.goto(`/swiftter/p/${SEEDED.rtl}`);

		const content = page.locator(".post-content").first();

		await expect(content).toHaveAttribute("dir", "auto");
		await expect(content).toContainText("أحب هذا الألبوم");
		expect(await content.locator("p").first().evaluate((paragraph) => getComputedStyle(paragraph).unicodeBidi)).toBe("plaintext");
	});

	test("a Post torn up since still has a thread page and shows as torn up where it was reshared", async ({ page, request }) => {
		const reshare = (await allItems(request)).find((item) => item.kind === "reshare" && item.post.id === SEEDED.tornUp);

		expect(reshare?.post).toEqual({ id: SEEDED.tornUp, tornUp: true });
		const response = await page.goto(`/swiftter/p/${SEEDED.tornUp}`);

		await expect(page.getByRole("heading", { level: 1, name: "A torn-up note" })).toBeVisible();
		await expect(page.getByText("This note was torn up by its author.")).toBeVisible();

		// Its author is gone too: not in the page, its structured data or the thread's payload.
		expect(await response?.text()).not.toContain("Sunny Okafor");
		const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
		const structured = blocks.map((block) => JSON.parse(block) as Record<string, unknown>).find((data) => data["@type"] === "DiscussionForumPosting");

		expect(structured).toBeDefined();
		expect(structured).not.toHaveProperty("author");
	});

	test("a note moderation refused has no public page and is not in the feed", async ({ page, request }) => {
		const response = await page.goto(`/swiftter/p/${SEEDED.blocked}`);

		expect(response?.status()).toBe(404);
		expect(await isPublic(request, "moderation refused as unkind")).toBe(false);
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
		const editor = page.getByRole("textbox", { name: "Write a note" });

		await editor.click();
		await editor.pressSequentially(text);
		await page.getByRole("button", { name: "Pass note", exact: true }).click();

		const first = feedPosts(page).first();

		await expect(first).toContainText(text);
		await expect(first.getByText(readTestMember()!.name, { exact: true })).toBeVisible();

		// Still first after a reload, so it was stored, not just shown.
		await page.reload();
		await expect(feedPosts(page).first()).toContainText(text);
	});

	test("a Post containing a script is stored and rendered without running it, in the feed and on its page", async ({ page }) => {
		await signIn(page);

		const marker = `scripted ${Date.now()}`;
		const response = await write(page, `<p>${marker}</p><script>window.__swiftterPwned = true</script><svg onload="window.__swiftterPwned = true"></svg><img src=x onerror="window.__swiftterPwned = true">`);

		expect(response.status()).toBe(201);
		const { note } = (await response.json()) as { note: FeedPost };

		expect(note.content).toContain(marker);
		expect(note.content).not.toMatch(/<script|onload|onerror|<img/i);

		await page.reload();
		const first = feedPosts(page).first();

		await expect(first).toContainText(marker);
		await expect(first.locator("script, img")).toHaveCount(0);
		await page.goto(`/swiftter/p/${note.id}`);
		await expect(page.getByText(marker, { exact: true })).toBeVisible();
		expect(await page.evaluate(() => (window as { __swiftterPwned?: boolean }).__swiftterPwned)).toBeUndefined();
	});

	test("a Post with nothing left after sanitising, or only spaces, is rejected with 400", async ({ page }) => {
		await signIn(page);

		expect((await write(page, "<script>alert(1)</script><p><br></p>")).status()).toBe(400);
		expect((await write(page, "<p>   </p><p> </p>")).status()).toBe(400);
	});

	test("a publish request without BotID's token is refused with 403 and nothing is stored", async ({ page }) => {
		await signIn(page);

		const content = `<p>scripted bot ${Date.now()}</p>`;
		const response = await page.request.post(FEED, { data: { content } });

		expect(response.status()).toBe(403);
		expect(await isPublic(page.request, content)).toBe(false);
	});

	test("the composer's formatting (bold, italic, lists, link) is published as HTML", async ({ page }) => {
		await signIn(page);

		const marker = `formatted ${Date.now()}`;
		const editor = page.getByRole("textbox", { name: "Write a note" });
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

		await page.getByRole("button", { name: "Pass note", exact: true }).click();
		const { note } = (await (await published).json()) as { note: FeedPost };

		expect(note.content).toContain("<strong>loud</strong>");
		expect(note.content).toContain(`<em>${marker}</em>`);
		expect(note.content).toMatch(/<ul><li><p>first bullet<\/p><\/li><\/ul>/);
		expect(note.content).toMatch(/<ol><li><p>first number<\/p><\/li><\/ol>/);
		expect(note.content).toContain('href="https://example.com/eras"');

		const first = feedPosts(page).first();

		await expect(first).toContainText(marker);
		expect(await first.locator("li", { hasText: "first bullet" }).evaluate((item) => getComputedStyle(item).listStyleType)).toBe("disc");
		await expect(first.getByRole("link", { name: "my link" })).toHaveAttribute("href", "https://example.com/eras");
		// The composer is empty again, ready for the next note.
		await expect(editor).toHaveText("");
	});

	test("a Member tears up their own Post, after confirming, and it is gone for good", async ({ page }) => {
		await signIn(page);

		const text = `short-lived note ${Date.now()}`;
		const published = await write(page, `<p>${text}</p>`);

		expect(published.status()).toBe(201);
		const { note } = (await published.json()) as { note: FeedPost };

		await page.reload();
		const shown = feedPosts(page).filter({ hasText: text });
		// Each note's control and dialog are named by its first words; the note by its author and time.
		const tearUp = shown.getByRole("button", { name: `tear up your note “${text}”` });
		const dialog = page.getByRole("dialog", { name: `Tear up this note? “${text}”` });

		await expect(shown).toHaveAccessibleName(`${readTestMember()!.name} just now`);

		// Changing their mind, with the button or with Escape, keeps the note.
		await tearUp.click();
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole("button", { name: "Keep it" })).toBeFocused();
		await expectNoAxeViolations(page);
		await dialog.getByRole("button", { name: "Keep it" }).click();
		await expect(dialog).toBeHidden();
		await tearUp.click();
		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
		await expect(shown).toHaveCount(1);

		const nextId = await shown.evaluate((note) => note.nextElementSibling?.id);

		await tearUp.click();
		await dialog.getByRole("button", { name: "Tear it up" }).click();
		await expect(shown).toHaveCount(0);
		await expect(page.getByText("Note torn up.")).toBeVisible();
		// The keyboard goes on to the next note, not the top of the page.
		await expect(page.locator(`[id="${nextId}"]`)).toBeFocused();

		await page.reload();
		await expect(feedPosts(page).first()).toBeVisible();
		await expect(feedPosts(page).filter({ hasText: text })).toHaveCount(0);
		expect(await isPublic(page.request, text)).toBe(false);
		// Already gone.
		expect((await page.request.delete(`${FEED}/${note.id}`, { headers: BOTID_HUMAN })).status()).toBe(404);
	});

	test("a Member can only tear up their own Posts: no button on others', 404 from the route", async ({ page }) => {
		await signIn(page);

		const demo = (await allItems(page.request)).flatMap((item) => (item.kind === "post" && item.post.isDemo ? [item.post] : []))[0];

		for (let turn = 0; turn < 12 && !(await feedPosts(page).filter({ hasText: "Juniper Wells" }).first().isVisible()); turn++) {
			await page.getByRole("button", { name: /older notes/ }).click();
		}
		await expect(feedPosts(page).filter({ hasText: "Juniper Wells" }).first()).toBeVisible();
		await expect(feedPosts(page).filter({ hasText: "Juniper Wells" }).getByRole("button", { name: /tear up/ })).toHaveCount(0);

		for (const id of [demo.id, "not-a-post", "00000000-0000-4000-8000-000000000000"]) {
			expect((await page.request.delete(`${FEED}/${id}`, { headers: BOTID_HUMAN })).status()).toBe(404);
		}
		expect((await allItems(page.request)).some((item) => item.post.id === demo.id)).toBe(true);
	});

	test("passes axe, fits a phone and is still under reduced motion", async ({ page }) => {
		await signIn(page);
		await expect(page.getByRole("textbox", { name: "Write a note" })).toBeVisible();
		await expectNoAxeViolations(page);

		await page.setViewportSize(PHONE);
		await expectNoHorizontalOverflow(page);

		await expectReducedMotion(page);
	});
});

// The shortest and longest notes, and every kind of text. A fresh Member, so
// these notes don't count against the shared test Member's limit.
test.describe("Swiftter, note edge cases", () => {
	test.skip(!!writeGuard(), writeGuard() ?? "");
	const state = groupMember("edge", "Edge Case Tester");

	test.use({ storageState: async ({}, provide) => provide(existsSync(state) ? state : undefined) });

	test("1 and 1000 characters pass, 1001 is refused with the count; unicode, emoji and RTL arrive intact", async ({ page }) => {
		await page.goto("/swiftter");

		expect((await write(page, "<p>✨</p>")).status()).toBe(201);
		expect((await write(page, `<p>${"a".repeat(1000)}</p>`)).status()).toBe(201);
		const tooLong = await write(page, `<p>${"a".repeat(1001)}</p>`);

		expect(tooLong.status()).toBe(400);
		expect(((await tooLong.json()) as { error: string }).error).toMatch(/1001 characters.*1000/);

		const text = "Ça fait du bien 🌲🎶 · אלבום נפלא · أغنية جميلة";
		const response = await write(page, `<p>${text}</p>`);

		expect(response.status()).toBe(201);
		expect(((await response.json()) as { note: FeedPost }).note.content).toBe(`<p>${text}</p>`);
	});

	test("the composer counts characters near the limit and will not send too many", async ({ page }) => {
		await page.goto("/swiftter");

		const editor = page.getByRole("textbox", { name: "Write a note" });

		await editor.fill("b".repeat(1001));
		await expect(page.getByText("1001/1000")).toBeVisible();
		await expect(page.getByText(/: too long/)).toBeVisible();
		await expect(page.getByRole("button", { name: "Pass note", exact: true })).toBeDisabled();
		await editor.press("Backspace");
		await expect(page.getByText("1000/1000")).toBeVisible();
		await expect(page.getByRole("button", { name: "Pass note", exact: true })).toBeEnabled();
	});
});

// Every note is checked by AI moderation before it is public (service/moderation.ts).
// The suite runs it in its fake mode (SWIFTTER_MODERATION=fake): a note containing
// a marker word is refused as unkind or off-topic, or gets no verdict; the rest are allowed.
const MARKER = { insult: "fake-insult", offTopic: "fake-off-topic", down: "fake-moderation-down" };

test.describe("Swiftter, moderation", () => {
	test.skip(!!writeGuard(), writeGuard() ?? "");
	// One Member for the group: its refused and pending notes (5, exactly the Post limit) count like any other.
	const state = groupMember("moderation", "Moderated Member");

	test.use({ storageState: async ({}, provide) => provide(existsSync(state) ? state : undefined) });
	// The browser logs refused notes, and a refused note's 404 page, as failed requests.
	test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of (404|422)/] });

	for (const { name, marker, category, message, status } of [
		{ name: "an unkind Post", marker: MARKER.insult, category: "insult", message: /unkind/, status: "Not passed: reads as unkind" },
		{ name: "an off-topic Post", marker: MARKER.offTopic, category: "off_topic", message: /Taylor/, status: "Not passed: off-topic" },
	]) {
		test(`${name} is refused with 422, saying why; it is kept for its author only, never public`, async ({ page, browser }) => {
			await page.goto("/swiftter");

			const text = `${marker} ${Date.now()}`;
			const response = await write(page, `<p>${text}</p>`);

			expect(response.status()).toBe(422);
			const body = (await response.json()) as { status: string; category: string; message: string; note: HeldNote };

			expect(body).toMatchObject({ status: "blocked", category });
			expect(body.message).toMatch(message);
			expect(await isPublic(page.request, text)).toBe(false);
			expect((await page.goto(`/swiftter/p/${body.note.id}`))?.status()).toBe(404);

			// Its author sees it, with the status in words and the reason.
			expect((await mine(page.request)).held).toContainEqual(expect.objectContaining({ id: body.note.id, status: "blocked", category }));
			await page.goto("/swiftter");
			const held = page.getByRole("region", { name: "Only you can see these" });

			await expect(held.getByText(status)).toBeVisible();
			await expect(held).toContainText(text);
			await expectNoAxeViolations(page);

			// Nobody else does (the shared test Member, here).
			const other = await openAs(browser, MEMBER_STATE);

			expect((await mine(other.page.request)).held.some((note) => note.id === body.note.id)).toBe(false);
			await other.close();
		});
	}

	test("a refused Post stays in the composer with the reason written on the note", async ({ page }) => {
		await page.goto("/swiftter");

		const text = `buy cheap sneakers ${MARKER.offTopic} ${Date.now()}`;
		const editor = page.getByRole("textbox", { name: "Write a note" });

		await editor.click();
		await editor.pressSequentially(text);
		await page.getByRole("button", { name: "Pass note", exact: true }).click();

		await expect(page.getByRole("form", { name: "Pass a note" }).getByRole("alert")).toContainText(/Taylor/);
		await expect(editor).toHaveText(text);
		expect(await isPublic(page.request, text)).toBe(false);
	});

	test("with no verdict the note is kept pending, shown to its author with a capped “check again”", async ({ page }) => {
		await page.goto("/swiftter");

		const text = `${MARKER.down} ${Date.now()}`;
		const response = await write(page, `<p>${text}</p>`);

		expect(response.status()).toBe(202);
		expect(((await response.json()) as { status: string }).status).toBe("pending");
		expect(await isPublic(page.request, text)).toBe(false);

		// Through the composer: saved, cleared, announced, and waiting in the Member's margin.
		const second = `${MARKER.down} second ${Date.now()}`;
		const editor = page.getByRole("textbox", { name: "Write a note" });

		await editor.click();
		await editor.pressSequentially(second);
		await page.getByRole("button", { name: "Pass note", exact: true }).click();
		await expect(editor).toHaveText("");
		await expect(page.getByRole("status").filter({ hasText: /couldn't be checked just now/ })).toBeAttached();

		const held = page.getByRole("region", { name: "Only you can see these" });
		const note = held.getByRole("listitem").filter({ hasText: second });

		await expect(note.getByText("Waiting for a check")).toBeVisible();
		await expectNoAxeViolations(page);

		// The fake stays down for this note: three more checks, then no more.
		for (let check = 0; check < 3; check++) {
			await note.getByRole("button", { name: "check again" }).click();
			await expect(note.getByRole("button", { name: /checking/ })).toHaveCount(0);
		}
		await expect(note.getByRole("button", { name: "check again" })).toHaveCount(0);
		await expect(note.getByText("Waiting for a check")).toBeVisible();
		expect(await isPublic(page.request, second)).toBe(false);
	});
});

// Two Members talking: one writes, the other replies and reshares.
test.describe("Swiftter, replies and reshares", () => {
	test.skip(!!writeGuard(), writeGuard() ?? "");
	// Two Members for the group: the author (this test's page) and a fan (another context).
	const author = groupMember("author", "Thread Starter");
	const fan = groupMember("fan", "Big Fan");

	test.use({ storageState: async ({}, provide) => provide(existsSync(author) ? author : undefined) });
	test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of (404|409|422)/] });

	test("a Member replies in a thread, nested, and the reply is counted on the feed", async ({ page, browser }) => {
		await page.goto("/swiftter");
		const text = `What's your favourite bridge? ${Date.now()}`;
		const { note } = (await (await write(page, `<p>${text}</p>`)).json()) as { note: FeedPost };
		const replier = await openAs(browser, fan);

		await replier.page.goto(`/swiftter/p/${note.id}`);
		await replier.page.getByRole("button", { name: "reply to Thread Starter" }).click();
		const composer = replier.page.getByRole("textbox", { name: "Reply to Thread Starter" });

		await composer.click();
		await composer.pressSequentially("The one on track five, easily.");
		await replier.page.getByRole("button", { name: "Reply", exact: true }).click();
		await expect(replier.page.getByRole("heading", { level: 2, name: "1 reply" })).toBeVisible();
		await expect(replier.page.getByText("The one on track five, easily.", { exact: true })).toBeVisible();
		// The composer closed: the keyboard is on the reply it wrote.
		await expect(replier.page.getByRole("article").filter({ hasText: "The one on track five, easily." })).toBeFocused();

		// A reply to the reply nests under it.
		await replier.page.getByRole("button", { name: "reply to Big Fan" }).click();
		const nested = replier.page.getByRole("textbox", { name: "Reply to Big Fan" });

		await nested.click();
		await nested.pressSequentially("Replying to myself, as one does.");
		await replier.page.getByRole("button", { name: "Reply", exact: true }).click();
		await expect(replier.page.getByRole("heading", { level: 2, name: "2 replies" })).toBeVisible();
		await expect(replier.page.locator("ol ol").getByText("Replying to myself, as one does.", { exact: true })).toBeVisible();
		await expectNoAxeViolations(replier.page);

		// The author sees both, and the feed counts them.
		await page.goto(`/swiftter/p/${note.id}`);
		await expect(page.getByText("Replying to myself, as one does.", { exact: true })).toBeVisible();
		const feed = (await allItems(page.request)).find((item) => item.kind === "post" && item.post.id === note.id);

		expect(feed?.post).toMatchObject({ replyCount: 2 });
		await replier.close();
	});

	test("a refused reply shows under its parent to its author only", async ({ page, browser }) => {
		await page.goto("/swiftter");
		const { note } = (await (await write(page, `<p>be nice ${Date.now()}</p>`)).json()) as { note: FeedPost };
		const replier = await openAs(browser, fan);

		await replier.page.goto(`/swiftter/p/${note.id}`);
		await replier.page.getByRole("button", { name: "reply to Thread Starter" }).click();
		const composer = replier.page.getByRole("textbox", { name: "Reply to Thread Starter" });

		await composer.click();
		await composer.pressSequentially(`${MARKER.insult} reply`);
		await replier.page.getByRole("button", { name: "Reply", exact: true }).click();
		await expect(replier.page.getByText(/Only you can see this reply: it wasn't passed, it reads as unkind/)).toBeVisible();

		await page.goto(`/swiftter/p/${note.id}`);
		await expect(page.getByRole("heading", { level: 2, name: "No replies yet" })).toBeVisible();
		await expect(page.getByText(`${MARKER.insult} reply`)).toHaveCount(0);
		await replier.close();
	});

	test("reshare with credit to the author; not your own, not twice, and undo; a torn-up original shows as such", async ({ page, browser }) => {
		await page.goto("/swiftter");
		const text = `Reshare me ${Date.now()}`;
		const { note } = (await (await write(page, `<p>${text}</p>`)).json()) as { note: FeedPost };

		// Not your own: no button, and the route says why.
		await page.goto("/swiftter");
		await expect(feedPosts(page).filter({ hasText: text }).getByRole("button", { name: /reshare/ })).toHaveCount(0);
		expect((await page.request.post(`${FEED}/${note.id}/reshare`, { headers: BOTID_HUMAN })).status()).toBe(422);

		const fanPage = await openAs(browser, fan);

		await fanPage.page.goto("/swiftter");
		const shown = feedPosts(fanPage.page).filter({ hasText: text }).first();
		const button = shown.getByRole("button", { name: /reshare Thread Starter's note/ });

		await expect(button).toHaveAttribute("aria-pressed", "false");
		const reshared = fanPage.page.waitForResponse((response) => response.url().endsWith(`/${note.id}/reshare`) && response.request().method() === "POST");

		await button.click();
		expect((await reshared).status()).toBe(201);
		await expect(button).toHaveAttribute("aria-pressed", "true");
		await expect(button).toContainText("(1 reshare)");
		// In flight it was aria-disabled, never disabled: the keyboard stayed on it.
		await expect(button).toBeFocused();
		expect((await fanPage.page.request.post(`${FEED}/${note.id}/reshare`, { headers: BOTID_HUMAN })).status()).toBe(409);
		expect((await mine(fanPage.page.request)).reshared).toContain(note.id);

		// On the feed: credited to its author, passed on by the fan.
		await fanPage.page.reload();
		const entry = feedPosts(fanPage.page).filter({ hasText: "Big Fan reshared" }).first();

		await expect(entry).toContainText(text);
		await expect(entry.getByText("Thread Starter", { exact: true })).toBeVisible();

		// The author tears it up: the reshare now shows it torn up.
		expect((await page.request.delete(`${FEED}/${note.id}`, { headers: BOTID_HUMAN })).status()).toBe(204);
		await fanPage.page.reload();
		await expect(fanPage.page.getByText("This note was torn up by its author.").first()).toBeVisible();
		expect((await allItems(fanPage.page.request)).find((item) => item.kind === "reshare" && item.post.id === note.id)?.post).toEqual({ id: note.id, tornUp: true });

		// Undo still works on the torn-up Post's reshare; replies to it are refused.
		expect((await fanPage.page.request.delete(`${FEED}/${note.id}/reshare`, { headers: BOTID_HUMAN })).status()).toBe(204);
		expect((await write(fanPage.page, "<p>too late</p>", note.id)).status()).toBe(404);
		await fanPage.close();
	});

	test("a Member's held reply shows on its thread after a reload, with check again and tear up", async ({ page, browser }) => {
		await page.goto("/swiftter");
		const { note } = (await (await write(page, `<p>hold on ${Date.now()}</p>`)).json()) as { note: FeedPost };
		const replier = await openAs(browser, fan);
		const text = `${MARKER.down} held reply ${Date.now()}`;

		expect((await write(replier.page, `<p>${text}</p>`, note.id)).status()).toBe(202);
		await replier.page.goto(`/swiftter/p/${note.id}`);
		const held = replier.page.getByRole("article", { name: /Your reply, waiting for a check/ });

		await expect(held).toContainText(text);
		await expect(replier.page.getByText("Only you can see this reply: it's waiting for a check.")).toBeVisible();
		await expect(held.getByRole("button", { name: "check again" })).toBeVisible();
		await expectNoAxeViolations(replier.page);

		// Nobody else sees it: not its thread's author.
		await page.goto(`/swiftter/p/${note.id}`);
		await expect(page.getByRole("heading", { level: 2, name: "No replies yet" })).toBeVisible();
		await expect(page.getByText(text)).toHaveCount(0);

		await held.getByRole("button", { name: /tear up your note/ }).click();
		await replier.page.getByRole("dialog").getByRole("button", { name: "Tear it up" }).click();
		await expect(held).toHaveCount(0);
		// The keyboard goes back to the note it answered.
		await expect(replier.page.locator(`[id="note-${note.id}"]`)).toBeFocused();
		await replier.page.reload();
		await expect(replier.page.getByRole("heading", { level: 2, name: "No replies yet" })).toBeVisible();
		await expect(replier.page.getByText(text)).toHaveCount(0);
		await replier.close();
	});

	test("on a thread, a reshare pressed before the Member's own view arrives stays pressed", async ({ page, browser }) => {
		await page.goto("/swiftter");
		const { note } = (await (await write(page, `<p>Reshare me quickly ${Date.now()}</p>`)).json()) as { note: FeedPost };
		const fanPage = await openAs(browser, fan);
		let release = () => {};
		const held = new Promise<void>((resolve) => (release = resolve));

		// /api/swiftter/me is read as the page opens (not reshared yet), and answers only after the click.
		await fanPage.page.route("/api/swiftter/me", async (route) => {
			const response = await route.fetch();

			await held;
			await route.fulfill({ response });
		});
		const answered = fanPage.page.waitForResponse("**/api/swiftter/me");

		await fanPage.page.goto(`/swiftter/p/${note.id}`);
		const button = fanPage.page.getByRole("button", { name: /reshare Thread Starter's note/ });
		const reshared = fanPage.page.waitForResponse((response) => response.url().endsWith(`/${note.id}/reshare`) && response.request().method() === "POST");

		await button.click();
		expect((await reshared).status()).toBe(201);
		release();
		await answered;
		await expect(button).toHaveAttribute("aria-pressed", "true");
		await expect(button).toContainText("(1 reshare)");
		await fanPage.close();
	});
});

// A Member may pass 5 notes in 10 minutes. Its own fresh Member, so the Posts
// the other tests publish as the shared test Member don't count.
test.describe("Swiftter, posting limit", () => {
	test.skip(!!writeGuard(), writeGuard() ?? "");
	// The browser logs the refused 6th Post as a failed request.
	test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of 429/] });

	test("only 5 Posts get through in 10 minutes, even sent at once; the composer keeps a refused one", async ({ page }) => {
		await signUpFresh(page, "Prolific Swiftie");

		const stamp = Date.now();

		// Seven at once: exactly five get through, however they interleave.
		const statuses = await Promise.all(Array.from({ length: 7 }, (_, index) => write(page, `<p>note ${index + 1} at once, ${stamp}</p>`).then((response) => response.status())));

		expect(statuses.toSorted()).toEqual([201, 201, 201, 201, 201, 429, 429]);

		const refused = await write(page, `<p>one too many, ${stamp}</p>`);

		expect(refused.status()).toBe(429);
		const retryAfter = Number(refused.headers()["retry-after"]);

		expect(retryAfter).toBeGreaterThan(0);
		expect(retryAfter).toBeLessThanOrEqual(600);
		expect(((await refused.json()) as { error: string }).error).toMatch(/10 minutes/);

		// The same refusal from the composer: written on the note, and the text stays.
		const text = `still one too many, ${stamp}`;
		const editor = page.getByRole("textbox", { name: "Write a note" });

		await editor.click();
		await editor.pressSequentially(text);
		await page.getByRole("button", { name: "Pass note", exact: true }).click();

		await expect(page.getByRole("form", { name: "Pass a note" }).getByRole("alert")).toContainText(/10 minutes/);
		await expect(editor).toHaveText(text);
		await expect(feedPosts(page).filter({ hasText: text })).toHaveCount(0);
		await expectNoAxeViolations(page);

		// Nothing more was stored.
		const posts = (await allItems(page.request)).flatMap((item) => (item.kind === "post" && item.post.content.includes(String(stamp)) ? [item.post] : []));

		expect(posts).toHaveLength(5);

		// Tearing a note up doesn't give its place back: deleting is no way round the limit.
		expect((await page.request.delete(`${FEED}/${posts[0].id}`, { headers: BOTID_HUMAN })).status()).toBe(204);
		expect((await write(page, `<p>after tearing up, ${stamp}</p>`)).status()).toBe(429);
	});
});

test("the scrapbook's page kickers never repeat a number across Home, Tours and Swiftter", async ({ request }) => {
	const numbers: string[] = [];

	for (const path of ["/", "/tours", "/swiftter"]) {
		const html = await (await request.get(path)).text();

		// Once per page: a kicker can also be in the page's React payload.
		numbers.push(...new Set([...html.matchAll(/page (\d+) ·/g)].map((match) => match[1])));
	}
	expect(numbers.length).toBeGreaterThanOrEqual(5);
	expect(new Set(numbers).size).toBe(numbers.length);
});

test("the old /forum address permanently redirects to /swiftter", async ({ page, request }) => {
	const response = await request.get("/forum", { maxRedirects: 0 });

	expect(response.status()).toBe(308);
	expect(response.headers()["location"]).toBe("/swiftter");

	await page.goto("/forum");
	await expect(page).toHaveURL("/swiftter");
});
