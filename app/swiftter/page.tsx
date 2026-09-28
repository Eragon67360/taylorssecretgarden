"use client";

import type { FeedPost } from "@/service/swiftter";

import { Show, SignInButton, SignOutButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import PostContent from "@/components/ui/PostContent";

const FEED_URL = "/api/swiftter/posts";

// Quill touches `document`, so the editor only loads in the browser.
const PostEditor = dynamic(() => import("@/components/ui/PostEditor"), {
	ssr: false,
	loading: () => <div className="w-full min-h-[42px] mb-8" />,
});

type Feed = { status: "loading" } | { status: "error" } | { status: "ready"; posts: FeedPost[] };

async function fetchFeed(): Promise<Feed> {
	try {
		const response = await fetch(FEED_URL, { cache: "no-store" });

		if (!response.ok) return { status: "error" };
		const { posts } = (await response.json()) as { posts: FeedPost[] };

		return { status: "ready", posts };
	} catch {
		return { status: "error" };
	}
}

function MemberAvatar({ name, src }: { name: string; src: string | null }) {
	if (src) {
		return (
			<Image alt={`${name}'s avatar`} className="size-10 rounded-full object-cover ring-2 ring-[#792e3a]/40" height={40} src={src} width={40} />
		);
	}

	const initials = name
		.split(/\s+/)
		.map((word) => word[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	return (
		<span aria-hidden className="size-10 shrink-0 rounded-full bg-[#7A2E3A] text-white text-sm font-semibold flex items-center justify-center ring-2 ring-[#792e3a]/40">
			{initials}
		</span>
	);
}

function PostCard({ post }: { post: FeedPost }) {
	const { author } = post;

	return (
		<article className="w-full rounded-2xl bg-white text-black shadow-md overflow-hidden">
			<header className="flex items-center gap-4 p-3">
				<MemberAvatar name={author.displayName} src={author.avatarUrl} />
				<div className="flex flex-col gap-1 min-w-0">
					<p className="text-sm font-semibold leading-none text-neutral-700 truncate">{author.displayName}</p>
					{author.username && <p className="text-sm tracking-tight text-neutral-400 truncate">@{author.username}</p>}
				</div>
				{post.isDemo && (
					<span className="ml-auto rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-600">Demo</span>
				)}
			</header>
			<div className="border-t border-neutral-200 p-3 break-words">
				<PostContent content={post.content} />
			</div>
			<footer className="border-t border-neutral-200 p-3 text-sm text-neutral-600">
				Posted on <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString()}</time>
			</footer>
		</article>
	);
}

function FeedMessage({ children }: { children: React.ReactNode }) {
	return <div className="w-full rounded-2xl bg-[#D9D9D9] text-black p-6 text-center text-sm flex flex-col items-center gap-3">{children}</div>;
}

export default function SwiftterPage() {
	const { isSignedIn, user } = useUser();
	const [feed, setFeed] = useState<Feed>({ status: "loading" });
	const [feedRequest, setFeedRequest] = useState(0);
	const [content, setContent] = useState("");
	const [publishing, setPublishing] = useState(false);

	useEffect(() => {
		let current = true;

		fetchFeed().then((result) => {
			if (current) setFeed(result);
		});

		return () => {
			current = false;
		};
	}, [feedRequest]);

	const retry = () => {
		setFeed({ status: "loading" });
		setFeedRequest((count) => count + 1);
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setPublishing(true);

		try {
			const response = await fetch(FEED_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content }),
			});
			const data = (await response.json().catch(() => ({}))) as { post?: FeedPost; error?: string };

			if (!response.ok || !data.post) {
				toast.error(data.error ?? "Your Post could not be published.");

				return;
			}

			const post = data.post;

			toast.success("Post published!");
			setContent("");
			setFeed((previous) => ({ status: "ready", posts: [post, ...(previous.status === "ready" ? previous.posts : [])] }));
		} catch {
			toast.error("Your Post could not be published.");
		} finally {
			setPublishing(false);
		}
	};

	return (
		<div className="w-full flex flex-col items-center">
			<div className="w-full h-[156px] bg-linear-to-r from-[#7A2E3A] to-[#4C3337] flex flex-col items-center justify-center text-white px-4">
				<h1 className="text-xl text-center font-inter font-bold">
					Welcome to the swift<span className="text-[#F00]">ter</span>
				</h1>
				<p className=" text-center text-[10px] mt-1">A social media made by swifties to talk about Taylor Swift for swifties</p>
			</div>

			<div className="w-full lg:max-w-[780px] flex flex-col lg:flex-row gap-5 mt-8 px-4 lg:px-0">
				<div className="flex flex-col w-full lg:max-w-[280px]">
					<div className="w-full rounded-2xl bg-[#D9D9D9] flex items-center justify-between gap-2 p-[18px] text-black">
						<div className="flex gap-2 items-center min-w-0">
							{isSignedIn ? <UserButton /> : <span aria-hidden className="size-8 shrink-0 rounded-full bg-white" />}

							<div className="flex flex-col text-[10px] min-w-0">
								<p className="truncate">{isSignedIn ? user.fullName || user.username || "Swiftie" : "Disconnected"}</p>
								<p className="truncate">@{isSignedIn ? (user.username ?? "swiftie") : "disconnected"}</p>
							</div>
						</div>
						<div className="flex flex-col gap-2">
							<Show when="signed-out">
								<SignUpButton>
									<button className="bg-[#792e3a] hover:bg-[#792e3a]/50 text-white text-xs px-3 py-1 rounded-full transition-all duration-200">
										Sign up
									</button>
								</SignUpButton>
								<SignInButton>
									<button className="bg-[#CDC9C0] text-xs px-3 py-1 rounded-full transition-all duration-200">Log in</button>
								</SignInButton>
							</Show>
							<Show when="signed-in">
								<SignOutButton redirectUrl="/swiftter">
									<button className="bg-[#CDC9C0] text-xs px-3 py-1 rounded-full transition-all duration-200">Sign out</button>
								</SignOutButton>
							</Show>
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-5 w-full lg:max-w-[480px]">
					<form className="w-full rounded-2xl bg-[#D9D9D9] flex flex-col items-center gap-2 p-[18px] text-black py-4" onSubmit={handleSubmit}>
						<PostEditor
							className="p-2 rounded-lg w-full mb-8"
							label="Write a Post"
							placeholder={isSignedIn ? "What's on your mind?" : "Log in to publish a Post"}
							readOnly={!isSignedIn}
							theme="bubble"
							value={content}
							onChange={setContent}
						/>
						<div className="w-full flex justify-end">
							<button
								className="rounded-full bg-[#792e3a] hover:bg-[#792e3a]/50 disabled:bg-gray-400 text-white px-3 py-1 transition-all duration-200"
								disabled={!isSignedIn || publishing}
								type="submit"
							>
								Post
							</button>
						</div>
					</form>

					<section aria-busy={feed.status === "loading"} aria-label="Posts" className="flex flex-col gap-2" role="feed">
						{feed.status === "loading" && <FeedMessage>Loading Posts…</FeedMessage>}
						{feed.status === "error" && (
							<FeedMessage>
								<p>Swiftter can&apos;t reach its Posts right now.</p>
								<button className="rounded-full bg-[#792e3a] hover:bg-[#792e3a]/50 text-white text-xs px-3 py-1" type="button" onClick={retry}>
									Try again
								</button>
							</FeedMessage>
						)}
						{feed.status === "ready" && feed.posts.length === 0 && <FeedMessage>No Posts yet. Be the first to publish one!</FeedMessage>}
						{feed.status === "ready" && feed.posts.map((post) => <PostCard key={post.id} post={post} />)}
					</section>
				</div>
			</div>
		</div>
	);
}
