import { describe, expect, it } from "vitest";

import { postPlainText, postText, sanitisePostHtml } from "@/service/post-html";

// Escaping is the XSS defence, independent of moderation: what the model
// thinks of a Post never decides what HTML reaches the page.

describe("sanitisePostHtml", () => {
	it.each([
		["a script element", "<p>hi</p><script>alert(1)</script>", /<script/i],
		["an event handler", '<p onclick="alert(1)">hi</p><img src=x onerror="alert(1)">', /onclick|onerror|<img/i],
		["a javascript: link", '<a href="javascript:alert(1)">click</a>', /javascript:/i],
		["a data: link", '<a href="data:text/html,<script>alert(1)</script>">x</a>', /data:/i],
		["an inline SVG with onload", '<svg onload="alert(1)"><circle/></svg>', /<svg|onload/i],
		["an iframe", '<iframe src="https://evil.example"></iframe>', /<iframe/i],
		["inline styles", '<p style="position:fixed;inset:0">cover</p>', /style=/i],
		["a protocol-relative link", '<a href="//evil.example">x</a>', /href="\/\/evil/i],
	])("removes %s", (_, html, forbidden) => {
		expect(sanitisePostHtml(html)).not.toMatch(forbidden);
	});

	it("keeps the formatting the composer writes, and opens links safely", () => {
		const html = '<p><strong>b</strong> <em>i</em> <a href="https://example.com">l</a></p><ul><li><p>one</p></li></ul><ol><li><p>two</p></li></ol>';
		const clean = sanitisePostHtml(html);

		expect(clean).toContain("<strong>b</strong>");
		expect(clean).toContain("<em>i</em>");
		expect(clean).toContain('href="https://example.com"');
		expect(clean).toContain('rel="noopener noreferrer nofollow"');
		expect(clean).toContain("<ul><li><p>one</p></li></ul>");
	});

	it("escapes text that looks like markup instead of dropping it", () => {
		expect(sanitisePostHtml("<p>1 &lt; 2 &amp;&amp; &lt;b&gt;</p>")).toBe("<p>1 &lt; 2 &amp;&amp; &lt;b&gt;</p>");
	});

	it("keeps unicode, emoji and right-to-left text", () => {
		expect(sanitisePostHtml("<p>שלום 🎶 Inès</p>")).toBe("<p>שלום 🎶 Inès</p>");
	});
});

describe("postText / postPlainText", () => {
	it("is empty for markup with no visible text", () => {
		expect(postText("<p><br></p><p>   </p><script>alert(1)</script>")).toBe("");
	});

	it("reads a Post as typed: one line per paragraph and list item, entities decoded", () => {
		const text = postPlainText("<p>Tom &amp; Jerry &lt;3</p><ul><li><p>one</p></li><li><p>two</p></li></ul>");

		// A list item's paragraph closes twice (</p></li>): a blank line between items, harmless for the model.
		expect(text.split("\n").filter(Boolean)).toEqual(["Tom & Jerry <3", "one", "two"]);
	});
});
