/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "cdn-images.dzcdn.net",
				port: "",
				pathname: "/images/**",
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
