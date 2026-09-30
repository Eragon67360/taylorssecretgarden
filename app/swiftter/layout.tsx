import { Toaster } from "sonner";

import { pageMetadata } from "@/lib/metadata";

// The feed's metadata. A page under /swiftter (a Post's own page) inherits it,
// so it must set its own `alternates.canonical` and og:url (pageMetadata),
// or it would name the feed as its canonical page.
export const metadata = pageMetadata({
	title: "Swiftter",
	description: "Swiftter, the fan feed of Taylor's Secret Garden: notes passed in class by Swifties.",
	path: "/swiftter",
});

export default function SwiftterLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<Toaster richColors position="bottom-center" />
			{children}
		</>
	);
}
