"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as m from "motion/react-m";

import { GardenMark } from "@/components/garden-mark";
import { Scribble } from "@/components/scrapbook";
import { cn } from "@/lib/utils";

/** The site's sections, each an index tab in its own pastel. */
const SECTIONS = [
  { name: "Home", path: "/", tab: "#DDE8D3" },
  { name: "Music", path: "/music", tab: "#F4D7DF" },
  { name: "Tours", path: "/tours", tab: "#D6E4F0" },
  { name: "Swiftter", path: "/swiftter", tab: "#F6E7B4" },
] as const;

// A section is current on its own path and on every page below it
// (e.g. /tours/the-eras-tour is under Tours).
function isCurrent(pathname: string, path: string) {
  if (path === "/") return pathname === "/";

  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * The journal's header: the garden's name, and index tabs for the sections
 * sticking up from the page's top edge. The current section's tab is pulled
 * up in the card colour and underlined in pen.
 */
export function SiteHeader() {
  const pathname = usePathname();

  // No paper of its own: the body's grain shows through, aligned (a second
  // grain here would also make the header the page's Largest Contentful Paint).
  return (
    <header className="border-line relative z-40 border-b" id="site-header">
      <a
        className="bg-card text-ink focus-ring sr-only z-50 rounded-md px-4 py-2 font-bold focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
        href="#main"
      >
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-end justify-between gap-x-6 gap-y-2 px-4 pt-4 sm:px-8 md:pt-7">
        <Link className="group focus-ring text-ink flex min-h-11 items-center gap-2 rounded-md pb-2" href="/">
          <GardenMark className="size-9 transition-transform duration-500 motion-safe:group-hover:rotate-[30deg]" />
          <span className="font-hand text-[26px] leading-none font-bold md:text-[28px]">Taylor&apos;s Secret Garden</span>
        </Link>

        <nav aria-label="Main" className="w-full sm:w-auto">
          <ul className="font-body flex items-end gap-1 text-[15px] font-semibold sm:gap-1.5">
            {SECTIONS.map((section, index) => {
              const current = isCurrent(pathname, section.path);

              return (
                <li key={section.path} className="flex-1 sm:flex-none">
                  <Link
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "focus-ring text-ink relative -mb-px flex min-h-11 items-center justify-center rounded-t-[10px] border border-b-0 px-3 sm:px-4",
                      "transition-[translate,padding] duration-200 ease-out",
                      current
                        ? "border-line z-10 pt-1 pb-2.5"
                        : "border-transparent pt-1.5 pb-1.5 motion-safe:hover:-translate-y-0.5",
                    )}
                    href={section.path}
                    style={{ rotate: `${index % 2 ? 0.8 : -0.8}deg` }}
                  >
                    {/* The tab itself: the section's pastel, or the card colour when it is the page you are on. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-t-[9px] opacity-80"
                      style={{ background: section.tab }}
                    />
                    {current && (
                      <m.span
                        aria-hidden="true"
                        className="bg-card absolute inset-0 rounded-t-[9px] shadow-[0_-2px_6px_rgba(60,40,20,.08)]"
                        layoutId="current-section-tab"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative">{section.name}</span>
                    {current && <Scribble className="absolute right-3 bottom-1 left-3 h-2.5 w-[calc(100%-24px)]" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
