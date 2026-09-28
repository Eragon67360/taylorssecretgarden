import sanitizeHtml from "sanitize-html";

/**
 * Post HTML with anything executable removed: the one sanitising policy for
 * Posts, applied when they are published and again when they are rendered.
 *
 * An allowlist of the formatting Swiftter's editors have produced: Tiptap's
 * paragraphs, bold, italic, links and lists (`<ul>/<ol><li><p>`), and, in
 * Posts from before the redesign, Quill 2's headings, quotes, code and lists
 * written as `<ol><li data-list="bullet">` (so `data-list` is kept). Everything else,
 * including inline styles and event handlers, is dropped.
 *
 * sanitize-html is pure JavaScript (no jsdom), so it runs on Vercel's Node
 * runtime and in the browser alike.
 */
const POLICY: sanitizeHtml.IOptions = {
	allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "a", "ol", "ul", "li", "h1", "h2", "h3", "blockquote", "code", "pre"],
	allowedAttributes: { a: ["href", "target", "rel"], li: ["data-list"] },
	allowedSchemes: ["http", "https", "mailto"],
	allowProtocolRelative: false,
	transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }) },
};

export function sanitisePostHtml(html: string): string {
	return sanitizeHtml(html, POLICY);
}

/** The visible text of some Post HTML, trimmed. */
export function postText(html: string): string {
	return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;| /g, " ").trim();
}
