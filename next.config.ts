import type { NextConfig } from "next";

import { withBotId } from "botid/next/config";

// Relative imports: the app's path aliases do not apply to this file.
import { AVATAR_REMOTE_PATTERNS } from "./lib/avatar";
import { NOINDEX_HEADER, isIndexable } from "./lib/indexing";

/**
 * Sent with every response, in every environment. The Content-Security-Policy
 * holds only directives that cannot break a script or a media source (no
 * script-src, style-src or media-src: BotID, Deezer previews and Cloudinary
 * video load as before): no framing of the site (clickjacking), no <base> or
 * plugin injection, and forms submit to this origin only. BotID's own path
 * keeps the `frame-ancestors 'self'` its wrapper adds after these (the last
 * header set for a path wins).
 */
const SECURITY_HEADERS = [
	{ key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
	// No "X-Powered-By: Next.js": it tells visitors nothing and scanners the stack.
	poweredByHeader: false,
	images: {
		// AVIF first (roughly a third smaller than WebP for photos and covers);
		// 60 is the quality of the large, above-the-fold pictures (home photo,
		// the selected Album cover), where bytes decide how soon the page paints.
		formats: ["image/avif", "image/webp"],
		qualities: [60, 75],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "cdn-images.dzcdn.net",
				port: "",
				pathname: "/images/**",
			},
			// The home photo and the Tour posters and photos, resized and served from this origin.
			{
				protocol: "https",
				hostname: "res.cloudinary.com",
				port: "",
				pathname: "/dluezegi8/**",
			},
			// Member avatars: Google account photos only (lib/avatar.ts). Clerk's
			// avatars (before ADR-0004) are gone: Members still holding one show
			// their initials instead.
			...AVATAR_REMOTE_PATTERNS,
		],
	},
	async redirects() {
		return [
			// Swiftter used to live at /forum.
			{ source: "/forum", destination: "/swiftter", permanent: true },
			// The old production address sends people to the canonical www host,
			// path and query kept. Pages only: API routes keep answering there, so
			// Vercel Cron and a tab left open on the old address still work. Neon
			// Auth trusts www (SEO-STRATEGY.md, pre-launch checklist).
			{
				source: "/:path((?!api/).*)",
				has: [{ type: "host", value: "taylorssecretgarden.vercel.app" }],
				destination: "https://www.taylorssecretgarden.com/:path",
				permanent: true,
			},
		];
	},
	async headers() {
		// Outside production, every response (pages, files, API) also says noindex (lib/indexing.ts).
		return [{ source: "/:path*", headers: isIndexable() ? SECURITY_HEADERS : [...SECURITY_HEADERS, NOINDEX_HEADER] }];
	},
};

// BotID: proxies its challenge script and API through this origin (lib/botid-routes.ts).
export default withBotId(nextConfig);
