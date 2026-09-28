"use client";

import type { ComponentProps, FocusEvent, MouseEvent, TouchEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

type IntentLinkProps = Omit<ComponentProps<typeof Link>, "href" | "prefetch"> & { href: string };

/**
 * A <Link> that prefetches its page once someone shows the intent to follow
 * it (pointer over it, a finger on it, keyboard focus), not as soon as it is
 * on screen. For the links on the first screen of every page (the header's
 * tabs, the opening spread's calls to action): their prefetches, a payload and
 * the page's code for each, would otherwise download alongside the page itself
 * and delay its first paint on a slow connection.
 */
export function IntentLink({ href, onMouseEnter, onTouchStart, onFocus, ...props }: IntentLinkProps) {
  const router = useRouter();
  const prefetch = () => router.prefetch(href);

  return (
    <Link
      href={href}
      prefetch={false}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        onFocus?.(event);
        prefetch();
      }}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        onMouseEnter?.(event);
        prefetch();
      }}
      onTouchStart={(event: TouchEvent<HTMLAnchorElement>) => {
        onTouchStart?.(event);
        prefetch();
      }}
      {...props}
    />
  );
}
