"use client";

import { createAuthClient } from "@neondatabase/auth/next";

import { markAuthClientLoaded } from "./member-hint";

/**
 * Neon Auth in the browser: sign-up, sign-in, sign-out and the session, all
 * through this origin's /api/auth. Imported only where someone signs in or out
 * (the guestbook), and loaded on demand for Members (lib/auth/member-hint.ts):
 * the header's sign-out and Swiftter's composer.
 */
export const authClient = createAuthClient();

// Tells the header a sign-in may happen on this page, so its sign-out appears without a reload.
if (typeof window !== "undefined") markAuthClientLoaded();
