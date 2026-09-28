import { mkdirSync, rmSync, writeFileSync } from "node:fs";

import { expect, test as setup } from "./fixtures";
import { MEMBER_DIR, MEMBER_FILE, MEMBER_STATE, newTestMember, writeGuard } from "./member";

// Signs up this run's test Member through the guestbook form (our own
// /api/auth), then keeps its session for the signed-in tests. Runs before
// every other test (playwright.config.ts), only on a disposable Neon branch.
setup("a visitor signs the guestbook and lands on Swiftter as a Member", async ({ page }) => {
	rmSync(MEMBER_DIR, { recursive: true, force: true });

	const refusal = writeGuard();

	setup.skip(!!refusal, refusal ?? "");

	const member = newTestMember();

	await page.goto("/sign-up");
	await page.getByRole("textbox", { name: "Name" }).fill(member.name);
	await page.getByRole("textbox", { name: "Email" }).fill(member.email);
	await page.getByLabel("Password").fill(member.password);
	await page.getByRole("button", { name: "Sign the guestbook" }).click();

	await expect(page).toHaveURL(/\/swiftter$/);
	await expect(page.getByText(`writing as ${member.name}`)).toBeVisible();
	await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

	mkdirSync(MEMBER_DIR, { recursive: true });
	writeFileSync(MEMBER_FILE, JSON.stringify(member));
	await page.context().storageState({ path: MEMBER_STATE });
});
