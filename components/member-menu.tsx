"use client";

import { authClient } from "@/lib/auth/client";

/**
 * The signed-in Member's corner of the header: their name and "Sign out".
 * Nothing for visitors. Loaded after the page (components/site-header.tsx).
 */
export default function MemberMenu() {
  const { data } = authClient.useSession();

  if (!data?.user) return null;

  return (
    <div className="flex min-h-11 items-center gap-3 pb-2 text-[14px]">
      <span className="text-soft hidden max-w-[32ch] truncate md:inline">
        signed in as <span className="text-ink font-semibold">{data.user.name || data.user.email}</span>
      </span>
      <button
        className="focus-ring text-ink min-h-9 rounded-[6px] px-1 font-bold underline underline-offset-2"
        type="button"
        onClick={() => authClient.signOut()}
      >
        Sign out
      </button>
    </div>
  );
}
