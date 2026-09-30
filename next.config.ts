import type { NextConfig } from "next";

import { withBotId } from "botid/next/config";

// A relative import: the app's path aliases do not apply to this file.
import { NOINDEX_HEADER, isIndexable } from "./lib/indexing";

const nextConfig: NextConfig = {
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
			// Member avatars: Google profile photos (Neon Auth's Google sign-in).
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
				port: "",
				pathname: "/**",
			},
			// Avatars stored for Members who signed in with Clerk, before Neon Auth (ADR-0004).
			{
				protocol: "https",
				hostname: "img.clerk.com",
				port: "",
				pathname: "/**",
			},
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
		// Outside production, every response (pages, files, API) says noindex (lib/indexing.ts).
		return isIndexable() ? [] : [{ source: "/:path*", headers: [NOINDEX_HEADER] }];
	},
};

// BotID: proxies its challenge script and API through this origin (lib/botid-routes.ts).
export default withBotId(nextConfig);
