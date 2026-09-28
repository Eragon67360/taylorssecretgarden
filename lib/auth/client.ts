"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/**
 * Neon Auth in the browser: sign-up, sign-in, sign-out and the session, all
 * through this origin's /api/auth. Imported only where someone signs in or out
 * (the guestbook, Swiftter, the header's sign-out, loaded after the page).
 */
export const authClient = createAuthClient();
