"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { memberPath } from "@/lib/swiftter";

import { fetchNewReplies } from "./api";

/*
  The header's "new replies" badge: replies other Members wrote to the
  signed-in Member's notes since they last looked. When they last looked is
  kept in this browser only (localStorage, per Member), as the database's own
  time from the last answer, so nothing about it is stored on the server.
  Opening Swiftter, their guestbook page or their Member page counts as
  looking.
*/

const key = (memberId: string) => `swiftter-replies-seen:${memberId}`;

// Storage can be missing or refuse (a private window, blocked site data): the badge then simply starts from now each time.
function readSeen(memberId: string): string | null {
  try {
    return localStorage.getItem(key(memberId));
  } catch {
    return null;
  }
}

function writeSeen(memberId: string, at: string) {
  try {
    localStorage.setItem(key(memberId), at);
  } catch {
    // Not kept: see readSeen.
  }
}

/** The pages where the Member sees their replies: the badge resets there. */
const looksAtReplies = (pathname: string, memberId: string) => pathname === "/swiftter" || pathname === "/guestbook" || pathname === memberPath(memberId);

/** How many new replies the signed-in Member has, read again on every page they open. 0 where they are looking at them. */
export function useNewReplies(memberId: string): number {
  const pathname = usePathname();
  const looking = looksAtReplies(pathname, memberId);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let current = true;
    const seen = readSeen(memberId);

    fetchNewReplies(looking ? null : seen).then((answer) => {
      if (!current || !answer) return;
      // Looking now, or looking for the first time: counted from now on.
      if (looking || !seen) writeSeen(memberId, answer.at);
      setCount(looking ? 0 : answer.count);
    });

    return () => {
      current = false;
    };
  }, [memberId, pathname, looking]);

  return looking ? 0 : count;
}
