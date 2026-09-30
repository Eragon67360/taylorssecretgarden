"use client";

import { type ReactNode, useEffect, useMemo, useSyncExternalStore } from "react";

import { currentMember, getSessionMember, type MemberUser, subscribeMember } from "@/lib/auth/member-hint";

/** The signed-in person, as Neon Auth's session reports them. */
export type SessionUser = MemberUser;

export type SessionState = { pending: true } | { pending: false; user: SessionUser | null };

/**
 * Who is signed in, for Swiftter's pages: the page's one session request,
 * shared with the header (lib/auth/member-hint.ts), which also completes a
 * Google sign-in coming back to the page. Follows signing out as it happens.
 * `probe` is always null now (there is no client to load); it stays so
 * callers that render it need not change.
 */
export function useMemberSession(): { session: SessionState; probe: ReactNode } {
  const member = useSyncExternalStore(subscribeMember, currentMember, () => undefined);

  useEffect(() => {
    getSessionMember();
  }, []);

  const session = useMemo<SessionState>(() => (member === undefined ? { pending: true } : { pending: false, user: member }), [member]);

  return { session, probe: null };
}
