import type { Page } from "@playwright/test";

import { existsSync } from "node:fs";
import path from "node:path";

import { SEED_NOTES, SEED_USERS, seedId } from "../scripts/seed-data";

import { PHONE, expectNoAxeViolations, expectNoHorizontalOverflow } from "./checks";
import { expect, test } from "./fixtures";
import { BOTID_HUMAN, MEMBER_DIR, MEMBER_STATE, newTestMember, writeGuard } from "./member";

// Members on Swiftter (issue #120): a Member's page (/swiftter/m/[id]), the
// names on notes leading there, "Your notes" on the guestbook page and the
// header's "new replies" badge. Against the development fixtures
// (scripts/seed-data.ts) and Members signed up for the run.

const FEED = "/api/swiftter/posts";

/** What a seed Member's page should count: their public Posts and replies (not refused, waiting or torn up). */
function seedCounts(key: keyof typeof SEED_USERS) {
	const published = SEED_NOTES.filter((note) => note.by === key && !note.moderation && !note.tornUp);

	return { notes: published.filter((note) => !note.parent).length, replies: published.filter((note) => note.parent).length };
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Opens Dario's page the way a reader would: from his name on one of his notes. */
async function openDariosPage(page: Page) {
	await page.goto(`/swiftter/p/${seedId("p", 2)}`);
	const dario = SEED_USERS.dario.name;

	await page.getByRole("article").first().getByRole("link", { name: dario, exact: true }).click();
	await expect(page).toHaveURL(/\/swiftter\/m\/[\w-]+$/);
	await expect(page.getByRole("heading", { level: 1, name: dario })).toBeVisible();
}

test.describe("Member pages, signed out", () => {
	test("a name on a note leads to the Member's page: their public notes, newest first, and their counts", async ({ page }) => {
		await openDariosPage(page);
		const { notes, replies } = seedCounts("dario");

		await expect(page.getByText(`${plural(notes, "note", "notes")} · ${plural(replies, "reply", "replies")}`)).toBeVisible();
		const feed = page.getByRole("feed", { name: `Notes by ${SEED_USERS.dario.name}` });

		await expect(feed.getByRole("article")).toHaveCount(notes);
		// Newest first: the Unicode note (p47) is his last.
		await expect(feed.getByRole("article").first()).toContainText("Café au lait");
		await expect(feed.getByText("(seed note 2)")).toBeVisible();
		// His refused note is his alone.
		await expect(page.getByText("moderation refused as unkind")).toHaveCount(0);
		// No link back to the page you are on.
		await expect(feed.getByRole("link", { name: SEED_USERS.dario.name, exact: true })).toHaveCount(0);
		await expectNoAxeViolations(page);
	});

	test("a Member's page is kept out of search engines and the sitemap, and shows no email", async ({ page, request }) => {
		await openDariosPage(page);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
		await expect(page).toHaveTitle(`${SEED_USERS.dario.name} on Swiftter · Taylor's Secret Garden`);
		expect(await page.content()).not.toContain(SEED_USERS.dario.email);
		expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/swiftter/m/");
	});

	test("a Member's notes are paged by their own route, which leaves out held and torn-up notes", async ({ page, request }) => {
		await openDariosPage(page);
		const id = page.url().split("/").pop()!;
		const response = await request.get(`/api/swiftter/members/${id}/posts`);

		expect(response.status()).toBe(200);
		const { items, nextCursor } = (await response.json()) as { items: { post: { id: string; author: { id: string }; publishedAt: string } }[]; nextCursor: string | null };

		expect(items.length).toBe(seedCounts("dario").notes);
		expect(nextCursor).toBeNull();
		expect(items.every((item) => item.post.author.id === id)).toBe(true);
		expect(items.map((item) => item.post.id)).not.toContain(seedId("p", 50));
		expect(items.map((item) => item.post.publishedAt)).toEqual(items.map((item) => item.post.publishedAt).toSorted().toReversed());
		expect((await request.get(`/api/swiftter/members/${id}/posts?cursor=nonsense`)).status()).toBe(400);
	});

	test.describe(() => {
		test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of 404/] });

		test("an unknown Member's page is 404", async ({ page, request }) => {
			const response = await page.goto("/swiftter/m/no_such_member");

			expect(response?.status()).toBe(404);
			await expect(page.getByRole("heading", { level: 1, name: "This page isn't in the guestbook." })).toBeVisible();
			expect((await request.get("/api/swiftter/members/no_such_member/posts")).status()).toBe(404);
		});
	});

	test("fits a 390px phone, the longest name included", async ({ page }) => {
		await page.setViewportSize(PHONE);
		await page.goto(`/swiftter/p/${seedId("p", 5)}`);
		await page.getByRole("article").first().getByRole("link", { name: SEED_USERS.long.name, exact: true }).click();
		await expect(page.getByRole("heading", { level: 1, name: SEED_USERS.long.name })).toBeVisible();
		await expectNoHorizontalOverflow(page);
		await expectNoAxeViolations(page);
	});

	test("the new-replies count is 401 signed out, and never cached", async ({ request }) => {
		const response = await request.get("/api/swiftter/me/replies");

		expect(response.status()).toBe(401);
		expect(response.headers()["cache-control"]).toBe("private, no-store");
	});
});

/** Signs a fresh Member up through the guestbook form, waiting out Neon Auth's limit on a burst of sign-ups. */
async function signUpFresh(page: Page, name: string) {
	const member = newTestMember();

	await page.goto("/sign-up");
	await page.getByRole("textbox", { name: "Name" }).fill(name);
	await page.getByRole("textbox", { name: "Email" }).fill(member.email);
	await page.getByLabel("Password").fill(member.password);

	for (let attempt = 1; ; attempt++) {
		await page.getByRole("button", { name: "Sign the guestbook" }).click();
		const signedIn = await page
			.getByText(`writing as ${name}`)
			.waitFor({ timeout: 20_000 })
			.then(() => true)
			.catch(() => false);

		if (signedIn) return;
		if (attempt === 4) throw new Error(`Signing up ${name} did not finish at ${page.url()}`);
		if (page.url().endsWith("/swiftter")) await page.reload();
		else await page.waitForTimeout(15_000);
		if (await page.getByText(`writing as ${name}`).isVisible()) return;
	}
}

/** Where the badge's "last looked" time is kept for this Member (components/swiftter/use-new-replies.ts). */
const seenKey = (memberId: string) => `swiftter-replies-seen:${memberId}`;

const readSeen = (page: Page, memberId: string) => page.evaluate((key) => localStorage.getItem(key), seenKey(memberId));

// One Member of their own for these tests (signed up once), so nobody else
// replies to their notes; the shared test Member replies.
test.describe("Member pages, signed in", () => {
	test.skip(!!writeGuard(), writeGuard() ?? "");
	test.describe.configure({ mode: "serial" });
	const state = path.join(MEMBER_DIR, "page-owner-state.json");
	const name = "Page Owner";

	test.beforeAll(async ({ browser }) => {
		test.setTimeout(120_000);
		const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });

		await signUpFresh(await context.newPage(), name);
		await context.storageState({ path: state });
		await context.close();
	});

	test.use({ storageState: async ({}, provide) => provide(existsSync(state) ? state : undefined) });
	// A refused note is answered 422, which the browser logs.
	test.use({ expectedConsoleMessages: [/Failed to load resource: the server responded with a status of 422/] });

	/** Notes this group wrote, shared by its tests (serial). */
	const written: { note?: string; memberId?: string } = {};

	test("the badge counts a reply from another Member, then resets when they open Swiftter", async ({ page, browser }) => {
		// Opening Swiftter is looking: from now on.
		await page.goto("/swiftter");
		await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
		const response = await page.request.post(FEED, { headers: BOTID_HUMAN, data: { content: `<p>Which bridge made you cry first? ${Date.now()}</p>` } });

		expect(response.status()).toBe(201);
		const { note } = (await response.json()) as { note: { id: string; author: { id: string } } };

		written.note = note.id;
		written.memberId = note.author.id;
		await expect.poll(() => readSeen(page, note.author.id)).not.toBeNull();

		// The shared test Member answers it.
		const other = await browser.newContext({ storageState: MEMBER_STATE });

		expect((await other.request.post(FEED, { headers: BOTID_HUMAN, data: { content: "<p>The Clean bridge, every time.</p>", parentId: note.id } })).status()).toBe(201);
		await other.close();

		// Anywhere else on the site, the header says so, in words for screen readers.
		await page.goto("/tours");
		const yourPage = page.getByRole("link", { name: /^Your page/ });

		await expect(yourPage).toHaveAccessibleName(/1 new reply$/);
		await expect(yourPage).toContainText("1");
		await expectNoAxeViolations(page, ["#site-header"]);
		await page.setViewportSize(PHONE);
		await expectNoHorizontalOverflow(page);

		// Opening Swiftter resets it, for good.
		const before = await readSeen(page, note.author.id);

		await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Swiftter" }).click();
		await expect(page).toHaveURL(/\/swiftter$/);
		await expect(yourPage).toHaveAccessibleName("Your page");
		await expect.poll(() => readSeen(page, note.author.id)).not.toBe(before);
		await page.goto("/tours");
		await page.waitForResponse((answer) => answer.url().includes("/api/swiftter/me/replies"));
		await expect(yourPage).toHaveAccessibleName("Your page");
	});

	test("the Member's page shows their public notes, not the refused one", async ({ page }) => {
		test.skip(!written.memberId, "Needs the note the badge test wrote");
		const refused = await page.request.post(FEED, { headers: BOTID_HUMAN, data: { content: `<p>fake-insult ${Date.now()}</p>` } });

		expect(refused.status()).toBe(422);

		// Their own reply under someone else's note, to be listed with their notes.
		const others = await page.request.get(FEED);
		const { items } = (await others.json()) as { items: { kind: string; post: { id: string; author?: { id: string } } }[] };
		const target = items.find((item) => item.kind === "post" && item.post.author && item.post.author.id !== written.memberId)!;

		expect((await page.request.post(FEED, { headers: BOTID_HUMAN, data: { content: "<p>Seconding this one.</p>", parentId: target.post.id } })).status()).toBe(201);

		// From their name on their note (the feed's first page may have moved on: other tests write too).
		await page.goto(`/swiftter/p/${written.note}`);
		await page.getByRole("article").first().getByRole("link", { name, exact: true }).click();
		await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
		await expect(page.getByText("1 note · 1 reply")).toBeVisible();
		const feed = page.getByRole("feed", { name: `Notes by ${name}` });

		await expect(feed.getByRole("article")).toHaveCount(1);
		await expect(feed.getByText(/Which bridge made you cry first/)).toBeVisible();
		await expect(page.getByText(/fake-insult/)).toHaveCount(0);
		await expect(feed.getByRole("link", { name: "1 reply to Page Owner's note" })).toHaveAttribute("href", `/swiftter/p/${written.note}`);
	});

	test("“Your notes” on the guestbook page lists their notes and replies, each a link to its thread", async ({ page }) => {
		test.skip(!written.note, "Needs the notes the tests above wrote");
		await page.goto("/guestbook");
		const yours = page.getByRole("region", { name: "Your notes" });

		await expect(yours.getByText(/2 notes and replies on Swiftter/)).toBeVisible();
		await expect(yours.getByRole("link", { name: /Which bridge made you cry first/ })).toHaveAttribute("href", `/swiftter/p/${written.note}`);
		await expect(yours.getByRole("listitem").filter({ hasText: /Which bridge/ })).toContainText("A note");
		await expect(yours.getByRole("listitem").filter({ hasText: "Seconding this one." })).toContainText("A reply");
		await expect(yours.getByText(/fake-insult/)).toHaveCount(0);
		await expect(yours.getByRole("link", { name: "Your Member page" })).toHaveAttribute("href", `/swiftter/m/${written.memberId}`);
		await expectNoAxeViolations(page);
		await page.setViewportSize(PHONE);
		await expectNoHorizontalOverflow(page);

		// A reply's link opens its thread on it.
		await yours.getByRole("link", { name: "Seconding this one." }).click();
		await expect(page).toHaveURL(/\/swiftter\/p\//);
		await expect(page.getByText("Seconding this one.", { exact: true })).toBeVisible();
	});
});
