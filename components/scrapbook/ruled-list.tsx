import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Height of one notebook line; each item sits on one. */
const LINE = 44;

type RuledListProps = ComponentPropsWithoutRef<"ol"> & {
  /** Handwritten heading at the top of the page (e.g. "tracklist (13)"). */
  title?: ReactNode;
  /** Handwritten sign-off under the last line. */
  footnote?: ReactNode;
};

/**
 * A page torn from a ruled notebook: punch holes, a red margin, one item per
 * line. Items are <RuledListItem>s; the list is an ordered list.
 */
export function RuledList({ title, footnote, className, children, ...props }: RuledListProps) {
  return (
    <div className={cn("bg-card text-ink relative overflow-hidden pt-4 pb-5 shadow-[0_1px_2px_rgba(0,0,0,.08),0_22px_36px_-22px_rgba(0,0,0,.55)]", className)}>
      {/* Ruling and margin, behind the text. */}
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(90deg, transparent 0 62px, color-mix(in srgb, var(--accent) 50%, transparent) 62px 64px, transparent 64px), repeating-linear-gradient(180deg, transparent 0 ${LINE - 1}px, var(--line) ${LINE - 1}px ${LINE}px)`,
          // Each item's line runs along its bottom edge: items start after the
          // 16px top padding and the 48px title row, if any.
          backgroundPosition: `0 0, 0 ${(16 + (title ? 48 : 0)) % LINE}px`,
        }}
      />
      {/* Punch holes, showing the page underneath. */}
      <span aria-hidden="true" className="absolute top-0 left-2.5 flex h-full flex-col justify-around py-8">
        {[0, 1, 2].map((hole) => (
          <span key={hole} className="bg-paper block size-4 rounded-full shadow-[inset_1px_1px_3px_rgba(0,0,0,.35)]" />
        ))}
      </span>
      {title && <p className="font-hand relative h-[48px] pl-[78px] text-[26px] leading-[44px] font-bold">{title}</p>}
      <ol className="relative [counter-reset:ruled-line]" {...props}>
        {children}
      </ol>
      {footnote && <p className="font-hand text-soft relative mt-3 pr-5 pl-[78px] text-[21px] font-bold">{footnote}</p>}
    </div>
  );
}

type RuledListItemProps = ComponentPropsWithoutRef<"li"> & {
  /** In the margin; the line number by default. */
  marker?: ReactNode;
};

/** One line of a <RuledList>: a handwritten marker in the margin, then the item. */
export function RuledListItem({ marker, className, children, ...props }: RuledListItemProps) {
  return (
    <li className={cn("flex items-center gap-3 pr-4 [counter-increment:ruled-line] sm:pr-6", className)} style={{ minHeight: LINE }} {...props}>
      {/* The list itself tells assistive tech the position; the margin number is ink. */}
      <span
        aria-hidden="true"
        className={cn(
          "font-hand text-soft w-[62px] shrink-0 pr-3 text-right text-[22px] font-bold",
          marker === undefined && "before:content-[counter(ruled-line)]",
        )}
      >
        {marker}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}
