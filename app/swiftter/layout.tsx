import type { Metadata } from "next";

export const metadata: Metadata = { title: "Swiftter" };

export default function SwiftterLayout({ children }: { children: React.ReactNode }) {
	return (
		<section className="flex flex-col items-center justify-center pb-[80px] md:pb-[180px] lg:pb-[240px] xl:pb-[300px]">{children}</section>
	);
}
