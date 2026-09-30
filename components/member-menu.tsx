"use client";

import type { MemberUser } from "@/lib/auth/member-hint";

import { useState } from "react";

import { signOut } from "@/lib/auth/client";

/**
 * The signed-in Member's corner of the header: their name and "Sign out".
 * Shown only once the page knows someone is signed in (components/site-header.tsx).
 */
export default function MemberMenu({ user }: { user: MemberUser }) {
  const [leaving, setLeaving] = useState(false);

  return (
    <div className="flex min-h-11 items-center gap-3 pb-2 text-[14px]">
      <span className="text-soft hidden max-w-[32ch] truncate md:inline">
        signed in as <span className="text-ink font-semibold">{user.name || user.email}</span>
      </span>
      <button
        className="focus-ring text-ink min-h-9 rounded-[6px] px-1 font-bold underline underline-offset-2"
        disabled={leaving}
        type="button"
        onClick={async () => {
          setLeaving(true);
          // Signed out, the menu goes (lib/auth/member-hint.ts); if not, it stays to try again.
          await signOut();
          setLeaving(false);
        }}
      >
        Sign out
      </button>
    </div>
  );
}
