/** A base no real URL shares: a path resolved against it stays on it, anything else leaves. */
const BASE = "https://guestbook.invalid";

/**
 * `target` as a path on this site, or `fallback`. Resolved the way the browser
 * will resolve it (which drops tabs and newlines, and reads `\` as `/`), so
 * `/\t/evil.example`, `//evil.example`, `/\evil.example`, `https://…` and
 * `javascript:` can never send a Member to another site.
 */
export function safeRedirect(target: string | null | undefined, fallback: string): string {
	if (!target || !target.startsWith("/")) return fallback;

	try {
		const url = new URL(target, BASE);

		return url.origin === BASE ? `${url.pathname}${url.search}${url.hash}` : fallback;
	} catch {
		return fallback;
	}
}
