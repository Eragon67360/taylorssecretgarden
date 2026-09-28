import type { Metadata } from "next";

import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

export const metadata: Metadata = {
	title: "Swiftter",
	description: "Swiftter, the fan feed of Taylor's Secret Garden: notes passed in class by Swifties.",
};

/*
  Swiftter reads the signed-in Member, so Clerk loads here (and in the
  guestbook), not site-wide. `prefetchUI={false}`: Swiftter mounts none of
  Clerk's prebuilt forms, so their bundle (~250 KB) is not fetched.
*/
export default function SwiftterLayout({ children }: { children: React.ReactNode }) {
	return (
		<ClerkProvider prefetchUI={false}>
			<Toaster richColors position="bottom-center" />
			{children}
		</ClerkProvider>
	);
}
