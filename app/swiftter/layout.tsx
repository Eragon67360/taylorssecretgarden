import type { Metadata } from "next";

export const metadata: Metadata = { title: "Swiftter" };

export default function SwiftterLayout({ children }: { children: React.ReactNode }) {
	return (
		<section className="flex flex-col items-center justify-center py-10">{children}</section>
	);
}
