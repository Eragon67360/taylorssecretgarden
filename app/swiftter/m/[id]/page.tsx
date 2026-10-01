import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { MemberNotes } from "@/components/swiftter/member-notes";
import { PinnedPhoto } from "@/components/swiftter/note-paper";
import { pageMetadata } from "@/lib/metadata";
import { memberPath } from "@/lib/swiftter";
import { getMemberProfile as readMemberProfile, listMemberPosts } from "@/service/members";

type MemberPageProps = { params: Promise<{ id: string }> };

// The metadata and the page read the Member once per request, not twice.
const getMemberProfile = cache(readMemberProfile);

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export async function generateMetadata({ params }: MemberPageProps): Promise<Metadata> {
	const member = await getMemberProfile((await params).id);

	if (!member) return { title: "Member not found", robots: { index: false } };

	// Never in search results, nor in the sitemap: a Member's page is a
	// person's, and they did not ask to be found by name (issue #120).
	return pageMetadata({
		title: `${member.displayName} on Swiftter`,
		description: `The notes ${member.displayName} passed on Swiftter, the fan feed of Taylor's Secret Garden.`,
		path: memberPath(member.id),
		noindex: true,
	});
}

/**
 * A Member's page: their name and avatar, and their public Posts, newest
 * first, a page at a time like the feed (their replies are counted; each
 * opens in its thread from the notes it answers). Rendered on the server, so
 * it reads without JavaScript. No such Member, or a deleted account: 404.
 */
export default async function MemberPage({ params }: MemberPageProps) {
	// Per request: the notes' "3 minutes ago" must not be frozen into a built page.
	await connection();
	const member = await getMemberProfile((await params).id);

	if (!member) notFound();

	const firstPage = await listMemberPosts(member.id);

	return (
		<div className="relative mx-auto w-full max-w-[760px] overflow-x-clip px-4 pt-10 pb-20 sm:px-8 sm:pt-14">
			<p>
				<Link className="font-hand focus-ring text-accent rounded-sm text-[22px] font-bold underline underline-offset-4" href="/swiftter">
					<span aria-hidden="true">← </span>all notes
				</Link>
			</p>
			<header className="mt-6 mb-12 flex items-start gap-4">
				<span className="relative block h-[76px] w-[62px] shrink-0">
					<PinnedPhoto name={member.displayName} src={member.avatarUrl} />
				</span>
				<div className="min-w-0">
					<h1 className="font-serif text-[40px] leading-[1.05] font-semibold tracking-tight break-words sm:text-[52px]">{member.displayName}</h1>
					{member.username && <p className="text-soft mt-1 truncate text-[15px] font-semibold">@{member.username}</p>}
					<p className="font-hand text-soft mt-2 text-[22px] leading-tight font-bold">
						{plural(member.noteCount, "note", "notes")} · {plural(member.replyCount, "reply", "replies")}
						{member.isDemo && <span className="text-pen"> · Demo</span>}
					</p>
				</div>
			</header>
			<MemberNotes firstPage={firstPage} member={{ id: member.id, displayName: member.displayName }} />
		</div>
	);
}
