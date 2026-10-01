import type { ReactNode } from "react";

import { IntentLink } from "@/components/intent-link";
import { PressedFlower, WashiTape } from "@/components/scrapbook";

// The page's top edge, torn along the binding.
const TORN_TOP =
  "polygon(0 14px, 5% 4px, 10% 12px, 16% 2px, 22% 11px, 29% 3px, 35% 13px, 42% 5px, 49% 12px, 56% 2px, 63% 10px, 70% 3px, 77% 13px, 84% 4px, 91% 11px, 100% 5px, 100% 100%, 0 100%)";

type TornPageProps = {
  /** The small print above the title (e.g. "404 · page not found"). */
  kicker: string;
  title: string;
  /** The handwritten aside under the title. */
  aside: ReactNode;
  children?: ReactNode;
};

/**
 * A journal page for when the page asked for is not there, or broke: a torn
 * sheet taped back in, with a heading and where to go instead. Used by the
 * not-found and error pages. The tear is drawn on a layer behind the content,
 * so it never clips a focus outline.
 */
export function TornPage({ kicker, title, aside, children }: TornPageProps) {
  return (
    <div className="relative mx-auto w-full max-w-[760px] overflow-x-clip px-4 pt-12 pb-20 sm:px-8 sm:pt-16">
      <div className="relative -rotate-[0.6deg]">
        <span aria-hidden="true" className="absolute inset-0 [filter:drop-shadow(0_14px_16px_rgba(0,0,0,.18))]">
          <span className="bg-card paper-grain absolute inset-0" style={{ clipPath: TORN_TOP }} />
        </span>
        <WashiTape className="top-1 left-8" rotate={-6} width={92} />
        <WashiTape className="top-2 right-10" rotate={5} width={76} />
        <PressedFlower className="absolute -right-3 -bottom-10 h-44 w-24 rotate-[20deg] opacity-90 sm:-right-10 sm:h-56 sm:w-32" color="#8a8f6a" kind="leaf" />

        <div className="relative px-6 pt-12 pb-10 sm:px-12 sm:pt-14">
          <p className="text-soft text-[11px] font-bold tracking-[.26em] uppercase">{kicker}</p>
          <h1 className="font-serif mt-2 text-[clamp(2.3rem,7vw,3.6rem)] leading-[1.02] font-semibold tracking-[-0.02em]">{title}</h1>
          <p className="font-hand text-soft mt-4 max-w-[30rem] -rotate-1 text-[24px] leading-snug font-bold">{aside}</p>
          {children && <div className="relative z-10 mt-8">{children}</div>}
        </div>
      </div>
    </div>
  );
}

/** A handwritten list of pages to go to instead. */
export function WayOut({ label, links }: { label: string; links: { href: string; name: string }[] }) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-x-7 gap-y-3">
        {links.map(({ href, name }) => (
          <li key={href}>
            <IntentLink
              className="font-hand focus-ring text-ink decoration-pen inline-flex min-h-11 items-center rounded-sm text-[25px] font-bold underline decoration-wavy decoration-[1.5px] underline-offset-[5px]"
              href={href}
            >
              {name} <span aria-hidden="true">&nbsp;→</span>
            </IntentLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
