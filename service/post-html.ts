import "server-only";

import sanitizeHtml from "sanitize-html";

/**
 * Post HTML with anything executable removed: the one sanitising policy for
 * Posts, applied when they are published and again when the feed reads them.
 *
 * An allowlist of the formatting Swiftter's editors have produced: Tiptap's
 * paragraphs, bold, italic, links and lists (`<ul>/<ol><li><p>`), and, in
 * Posts from before the redesign, Quill 2's headings, quotes, code and lists
 * written as `<ol><li data-list="bullet">` (so `data-list` is kept). Everything else,
 * including inline styles and event handlers, is dropped.
 *
 * Server only: sanitize-html (with its parser and PostCSS) weighs ~70 KB
 * gzipped, too much to ship to the browser.
 */
const POLICY: sanitizeHtml.IOptions = {
	allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "a", "ol", "ul", "li", "h1", "h2", "h3", "blockquote", "code", "pre"],
	allowedAttributes: { a: ["href", "target", "rel"], li: ["data-list"] },
	allowedSchemes: ["http", "https", "mailto"],
	allowProtocolRelative: false,
	// `ugc`: links Members wrote, which the site vouches for no more than `nofollow` says.
	transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow ugc" }) },
};

export function sanitisePostHtml(html: string): string {
	return sanitizeHtml(html, POLICY);
}

/** The visible text of some Post HTML, trimmed. */
export function postText(html: string): string {
	return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;| /g, " ").trim();
}

const ENTITIES: Record<string, string> = { "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&amp;": "&" };

const decodeEntities = (text: string) => text.replace(/&(lt|gt|quot|#39|amp);/g, (entity) => ENTITIES[entity]);

/**
 * A Post as someone would read it (character counts, page descriptions):
 * postText with each paragraph, list item and line break on a line of its
 * own, and characters as typed rather than HTML entities.
 */
export function postPlainText(html: string): string {
	const text = postText(html.replace(/<br\s*\/?>|<\/(p|li|h[1-6]|blockquote|pre)>/gi, "$&\n"));

	return decodeEntities(text).replace(/\n{3,}/g, "\n\n");
}

/** An opening or closing link tag in sanitised HTML (sanitize-html writes attributes double-quoted). */
const LINK_TAG = /<a\b[^>]*>|<\/a\s*>/gi;
const HREF = /\bhref="([^"]*)"/i;

/**
 * A Post as AI moderation reads it: postPlainText, with every link's
 * destination written after its text, `label (link: https://host/path)`, so
 * a link labelled "Ticketmaster" that leads elsewhere is judged by where it
 * leads. A link whose text is its address is left as it is. For moderation
 * only: the stored and displayed HTML is unchanged.
 */
export function postModerationText(html: string): string {
	const clean = sanitisePostHtml(html);
	// Open links, innermost last, each with where its text starts; a stack, in case links arrive nested.
	// Hrefs stay entity-encoded while they sit in the HTML: postPlainText decodes everything at the end.
	const open: { href: string; start: number }[] = [];
	let out = "";
	let last = 0;

	for (const match of clean.matchAll(LINK_TAG)) {
		out += clean.slice(last, match.index);
		last = match.index + match[0].length;

		if (!match[0].startsWith("</")) {
			open.push({ href: match[0].match(HREF)?.[1] ?? "", start: out.length });
			continue;
		}

		const link = open.pop();

		if (link?.href && postPlainText(out.slice(link.start)).trim() !== decodeEntities(link.href)) out += ` (link: ${link.href})`;
	}
	out += clean.slice(last);
	// Links left open at the end (sanitize-html closes them, but a stray one would lose its destination).
	for (const link of open.reverse()) if (link.href) out += ` (link: ${link.href})`;

	return postPlainText(out);
}
