import type { Page } from "@playwright/test";

import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";

import { expect, test } from "./fixtures";

// Swiftter against a real (throwaway) Postgres: CI migrates and seeds it
// before the suite runs (`npm run db:migrate && npm run db:seed`).
const FEED = "/api/swiftter/posts";

type FeedPost = {
	id: string;
	content: string;
	isDemo: boolean;
	createdAt: string;
	author: { displayName: string; username: string | null; avatarUrl: string | null };
};

// The dedicated test Member on the development Clerk instance (see README).
const testMember = {
	identifier: process.env.E2E_CLERK_USER_USERNAME ?? "",
	password: process.env.E2E_CLERK_USER_PASSWORD ?? "",
	displayName: "Swiftter Tester",
};

async function signIn(page: Page) {
	await setupClerkTestingToken({ page });
	await page.goto("/swiftter");
	await clerk.signIn({
		page,
		signInParams: { strategy: "password", identifier: testMember.identifier, password: testMember.password },
	});
	await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

const feedPosts = (page: Page) => page.getByRole("feed", { name: "Posts" }).getByRole("article");

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
		await expect(page.getByRole("heading", { name: "Welcome to the swiftter" })).toBeVisible();

		const post = feedPosts(page).filter({ hasText: "cardigan" }).first();

		await expect(post).toBeVisible();
		await expect(post.getByText("Juniper Wells")).toBeVisible();
		await expect(post.getByText("@juniper_in_cardigan")).toBeVisible();
		await expect(post.getByText("Demo", { exact: true })).toBeVisible();
		expect(await feedPosts(page).count()).toBeGreaterThanOrEqual(10);
	});

	test("publishing a Post while signed out is rejected with 401", async ({ request }) => {
		const content = `<p>anonymous ${Date.now()}</p>`;
		const response = await request.post(FEED, { data: { content } });

		expect(response.status()).toBe(401);

		const { posts } = (await (await request.get(FEED)).json()) as { posts: FeedPost[] };

		expect(posts.some((post) => post.content.includes(content))).toBe(false);
	});

	test("the editor is read-only and signing in is offered", async ({ page }) => {
		await page.goto("/swiftter");

		await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Post", exact: true })).toBeDisabled();
	});
});

test.describe("Swiftter, signed in", () => {
	test.skip(
		!process.env.CI && !testMember.password,
		"Set E2E_CLERK_USER_USERNAME / E2E_CLERK_USER_PASSWORD to run the signed-in tests locally",
	);

	test("a Member publishes a Post and it appears first in the feed", async ({ page }) => {
		await signIn(page);

		const text = `Long live, from the test Member ${Date.now()}`;
		const editor = page.getByRole("textbox", { name: "Write a Post" });

		await editor.click();
		await editor.pressSequentially(text);
		await page.getByRole("button", { name: "Post", exact: true }).click();

		const first = feedPosts(page).first();

		await expect(first).toContainText(text);
		await expect(first.getByText(testMember.displayName)).toBeVisible();

		// Still first after a reload, so it was stored, not just shown.
		await page.reload();
		await expect(feedPosts(page).first()).toContainText(text);
	});

	test("a Post containing a script is stored and rendered without running it", async ({ page }) => {
		await signIn(page);

		const marker = `scripted ${Date.now()}`;
		const response = await page.request.post(FEED, {
			data: {
				content: `<p>${marker}</p><script>window.__swiftterPwned = true</script><img src="x" onerror="window.__swiftterPwned = true">`,
			},
		});

		expect(response.status()).toBe(201);
		const { post } = (await response.json()) as { post: FeedPost };

		expect(post.content).toContain(marker);
		expect(post.content).not.toMatch(/<script|onerror/i);

		await page.reload();
		const first = feedPosts(page).first();

		await expect(first).toContainText(marker);
		await expect(first.locator("script")).toHaveCount(0);
		expect(await page.evaluate(() => (window as { __swiftterPwned?: boolean }).__swiftterPwned)).toBeUndefined();
	});

	test("a Post with nothing left after sanitising is rejected with 400", async ({ page }) => {
		await signIn(page);

		const response = await page.request.post(FEED, { data: { content: "<script>alert(1)</script><p><br></p>" } });

		expect(response.status()).toBe(400);
	});
});

test("the old /forum address permanently redirects to /swiftter", async ({ page, request }) => {
	const response = await request.get("/forum", { maxRedirects: 0 });

	expect(response.status()).toBe(308);
	expect(response.headers()["location"]).toBe("/swiftter");

	await page.goto("/forum");
	await expect(page).toHaveURL("/swiftter");
});
