"use client";

import { useEffect } from "react";

import { authClient } from "@/lib/auth/client";

/** The signed-in person, as Neon Auth's client reports them. */
export type SessionUser = NonNullable<ReturnType<typeof authClient.useSession>["data"]>["user"];

export type SessionState = { pending: true } | { pending: false; user: SessionUser | null };

/**
 * Reports Neon Auth's session to its parent, and nothing on screen. Its own
 * chunk, with the client, loaded only when someone may be signed in
 * (lib/auth/member-hint.ts). Its session request also completes a Google
 * sign-in coming back to the page.
 */
export default function SessionProbe({ onChange }: { onChange: (state: SessionState) => void }) {
  const { data, isPending } = authClient.useSession();
  const user = data?.user ?? null;

  useEffect(() => {
    onChange(isPending ? { pending: true } : { pending: false, user });
  }, [isPending, user, onChange]);

  return null;
}
