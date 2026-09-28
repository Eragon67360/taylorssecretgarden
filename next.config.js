/** @type {import('next').NextConfig} */
const nextConfig = {
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
			// Member avatars from Clerk.
			{
				protocol: "https",
				hostname: "img.clerk.com",
				port: "",
				pathname: "/**",
			},
		],
	},
	async redirects() {
		// Swiftter used to live at /forum.
		return [{ source: "/forum", destination: "/swiftter", permanent: true }];
	},
};

module.exports = nextConfig;
