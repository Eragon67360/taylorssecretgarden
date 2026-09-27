import { expect, test } from "./fixtures";

test.describe("Home", () => {
	test("captions render in a loaded web font, not a system fallback", async ({ page }) => {
		await page.goto("/");

		const caption = page.getByText("Who is taylor swift anyway?");

		await expect(caption).toBeVisible();

		const { family, loaded } = await caption.evaluate(async (element) => {
			await document.fonts.ready;
			const family = getComputedStyle(element).fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
			let loaded = false;

			document.fonts.forEach((face) => {
				if (face.family.replace(/^["']|["']$/g, "") === family && face.status === "loaded") loaded = true;
			});

			return { family, loaded };
		});

		expect(loaded, `caption font "${family}" is a loaded web font`).toBe(true);
	});
});
