import type { Metadata } from "next";

import { Toaster } from "sonner";

export const metadata: Metadata = {
	title: "Swiftter",
	description: "Swiftter, the fan feed of Taylor's Secret Garden: notes passed in class by Swifties.",
};

export default function SwiftterLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			{/* Sonner's default colours: its "rich" palette fails WCAG AA contrast on success toasts. */}
			<Toaster position="bottom-center" />
			{children}
		</>
	);
}
