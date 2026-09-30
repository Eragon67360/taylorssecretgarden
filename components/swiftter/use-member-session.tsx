"use client";

import type { SessionState } from "./session-probe";

import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useState } from "react";

import { mayBeMember } from "@/lib/auth/member-hint";

const SessionProbe = dynamic(() => import("./session-probe"), { ssr: false });

/**
 * Who is signed in, for Swiftter's pages. Visitors never download Neon Auth's
 * client: one small request asks first (lib/auth/member-hint.ts), and only
 * someone who may be signed in gets the probe. Render `probe` somewhere on the
 * page.
 */
export function useMemberSession(): { session: SessionState; probe: ReactNode } {
  const [probing, setProbing] = useState(false);
  const [session, setSession] = useState<SessionState>({ pending: true });

  useEffect(() => {
    let current = true;

    mayBeMember().then((maybe) => {
      if (!current) return;
      if (maybe) setProbing(true);
      else setSession({ pending: false, user: null });
    });

    return () => {
      current = false;
    };
  }, []);

  return { session, probe: probing ? <SessionProbe onChange={setSession} /> : null };
}
