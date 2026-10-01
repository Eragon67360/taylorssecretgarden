"use client";

import type { MemberUser } from "@/lib/auth/member-hint";

import Link from "next/link";
import { useState } from "react";

import { useNewReplies } from "@/components/swiftter/use-new-replies";
import { signOut } from "@/lib/auth/client";

/** The badge says "99+" from here: the count stops at 100 (service/members.ts NEW_REPLIES_CAP). */
const NEW_REPLIES_SHOWN = 100;

/**
 * The signed-in Member's corner of the header: their name, their guestbook
 * page (with a badge counting new replies to their notes), the moderation
 * page for moderators, and "Sign out".
 * Shown only once the page knows someone is signed in (components/site-header.tsx).
 */
export default function MemberMenu({ user }: { user: MemberUser }) {
  const [leaving, setLeaving] = useState(false);
  const { count: newReplies, moderator } = useNewReplies(user.id);

  return (
    <div className="flex min-h-11 items-center gap-3 pb-2 text-[14px]">
      <span className="text-soft hidden max-w-[32ch] truncate md:inline">
        signed in as <span className="text-ink font-semibold">{user.name || user.email}</span>
      </span>
      {/* Their notes, data and account (app/(guestbook)/guestbook), with how many replies they have not seen. */}
      <Link className="focus-ring text-ink flex min-h-9 items-center gap-1.5 rounded-[6px] px-1 font-bold" href="/guestbook">
        <span className="underline underline-offset-2">Your page</span>
        {newReplies > 0 && (
          <span className="bg-pen rounded-full px-1.5 text-[12px] leading-[18px] font-extrabold text-white">
            <span aria-hidden="true">{newReplies >= NEW_REPLIES_SHOWN ? `${NEW_REPLIES_SHOWN - 1}+` : newReplies}</span>
            <span className="sr-only">
              , {newReplies >= NEW_REPLIES_SHOWN ? `${NEW_REPLIES_SHOWN - 1} or more` : newReplies} new {newReplies === 1 ? "reply" : "replies"}
            </span>
          </span>
        )}
      </Link>
      {/* Reports and appeals to handle (app/(guestbook)/guestbook/moderation): moderators only, and the page checks again. */}
      {moderator && (
        <Link className="focus-ring text-ink flex min-h-9 items-center rounded-[6px] px-1 font-bold underline underline-offset-2" href="/guestbook/moderation">
          Moderation
        </Link>
      )}
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
