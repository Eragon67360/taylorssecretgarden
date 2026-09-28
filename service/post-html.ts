import DOMPurify from "isomorphic-dompurify";

/**
 * Post HTML with anything executable removed: the one sanitising policy for
 * Posts, applied when they are published and again when they are rendered.
 * Quill's formatting (paragraphs, marks, links, and lists, which Quill 2 may
 * write as `<ol><li data-list="bullet">`) survives: DOMPurify keeps `data-*`
 * attributes by default. Inline styles are dropped.
 */
export function sanitisePostHtml(html: string): string {
	return DOMPurify.sanitize(html, { FORBID_ATTR: ["style"] });
}

/** The visible text of some Post HTML, trimmed. */
export function postText(html: string): string {
	return DOMPurify.sanitize(html, { RETURN_DOM: true }).textContent?.trim() ?? "";
}
