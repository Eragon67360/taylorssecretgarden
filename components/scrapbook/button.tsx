import type { ComponentProps, ReactNode } from "react";

import Link from "next/link";

import { IntentLink } from "@/components/intent-link";
import { cn } from "@/lib/utils";

/*
  Hover feedback comes in two parts: the label underlines for everyone, and,
  only when motion is welcome, the button lifts. So under reduced motion a
  hover still shows. Neither happens while the button is disabled or
  aria-disabled (a control kept focusable while it can't be used).
*/
const VARIANTS = {
  /** The page's main action: a solid block in the Era's accent. */
  primary: "bg-accent text-on-accent px-5 shadow-[0_2px_0_rgba(0,0,0,.15)]",
  /** An action that can't be undone (tearing up a note, deleting an account): pen red. */
  danger: "bg-pen px-5 text-white",
  /** The quiet way out beside a primary or danger button ("Keep it"): underlined ink, no fill. */
  text: "text-ink px-3",
} as const;

const SHAPES = {
  block: "min-h-11 rounded-[4px]",
  /*
    A luggage tag, punched and strung. The tag's shape is a layer behind the
    button: clipped on the button itself, it would cut off the focus outline
    too. Its fill comes from that layer, so the variant's own is cleared.
  */
  tag: "isolate min-h-12 rounded-[4px] bg-transparent py-3.5 pr-6 pl-9 shadow-none gap-3 motion-safe:not-aria-disabled:not-disabled:hover:-rotate-2",
} as const;

/** The tag's fill, for each variant that has one. */
const TAG_FILLS = { primary: "bg-accent", danger: "bg-pen", text: "" } as const;

export type ButtonVariant = keyof typeof VARIANTS;

type Look = {
  variant?: ButtonVariant;
  /** A plain block, or a luggage tag (the opening spread's call to action). */
  shape?: keyof typeof SHAPES;
  /** A trailing arrow, nudged along on hover when motion is welcome. */
  arrow?: boolean;
};

/** The classes of a button in the kit's look, for the rare control that can't be a Button or ButtonLink. */
export function buttonClass({ variant = "primary", shape = "block" }: Pick<Look, "variant" | "shape"> = {}, className?: string) {
  return cn(
    "group/button focus-ring relative inline-flex items-center justify-center gap-2 text-[15px] font-bold tracking-wide",
    "transition-[translate,rotate,scale] duration-200 ease-out aria-disabled:opacity-60 disabled:opacity-60",
    "motion-safe:not-aria-disabled:not-disabled:hover:-translate-y-0.5 motion-safe:not-aria-disabled:not-disabled:active:scale-[.97]",
    VARIANTS[variant],
    SHAPES[shape],
    className,
  );
}

/** What goes inside: the tag's layers, the label, the arrow. */
function Inside({ variant = "primary", shape = "block", arrow = false, children }: Look & { children: ReactNode }) {
  return (
    <>
      {shape === "tag" && (
        <>
          {/* The shadow is a drop-shadow on a wrapper, since a clip also cuts off the clipped element's own shadow. */}
          <span aria-hidden="true" className="absolute inset-0 -z-10 [filter:drop-shadow(0_2px_0_rgba(0,0,0,.15))_drop-shadow(0_8px_9px_rgba(60,20,20,.35))]">
            <span
              className={cn("absolute inset-0 rounded-[4px] [clip-path:polygon(14px_0,100%_0,100%_100%,14px_100%,0_50%)]", TAG_FILLS[variant])}
              data-tag-shape=""
            />
          </span>
          <span aria-hidden="true" className="bg-paper absolute top-1/2 left-[14px] size-2.5 -translate-y-1/2 rounded-full" />
        </>
      )}
      <span
        className={
          // The text variant is underlined already: on hover its line thickens instead.
          variant === "text"
            ? "underline underline-offset-2 group-hover/button:group-not-aria-disabled/button:group-not-disabled/button:decoration-[2.5px]"
            : "decoration-[1.5px] underline-offset-[3px] group-hover/button:group-not-aria-disabled/button:group-not-disabled/button:underline"
        }
      >
        {children}
      </span>
      {arrow && (
        <span
          aria-hidden="true"
          className="transition-transform duration-200 ease-out motion-safe:group-hover/button:group-not-aria-disabled/button:group-not-disabled/button:translate-x-1"
        >
          →
        </span>
      )}
    </>
  );
}

type ButtonProps = Look & ComponentProps<"button">;

/**
 * A button in the scrapbook's look: primary (the accent block), danger (pen
 * red, for what can't be undone) or text (the quiet way out). Disable it with
 * `aria-disabled` to keep it focusable; it then dims and stops reacting to hover.
 */
export function Button({ variant, shape, arrow, className, children, type = "button", ...props }: ButtonProps) {
  return (
    <button className={buttonClass({ variant, shape }, className)} type={type} {...props}>
      <Inside arrow={arrow} shape={shape} variant={variant}>
        {children}
      </Inside>
    </button>
  );
}

type ButtonLinkProps = Look &
  Omit<ComponentProps<typeof IntentLink>, "children"> & {
    children: ReactNode;
    /** Prefetch the page only once someone shows the intent to follow the link (components/intent-link.tsx): for the first screen. */
    intent?: boolean;
  };

/** A link that looks like a Button, for a call to action that goes to another page. */
export function ButtonLink({ variant, shape, arrow, intent = false, className, children, ...props }: ButtonLinkProps) {
  const Anchor = intent ? IntentLink : Link;

  return (
    <Anchor className={buttonClass({ variant, shape }, className)} {...props}>
      <Inside arrow={arrow} shape={shape} variant={variant}>
        {children}
      </Inside>
    </Anchor>
  );
}
