import type { CSSProperties, ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";
import { ERA_LOOKS, type EraLook, type EraSlug } from "@/lib/eras";

/** The CSS variables that apply an Era's look (see styles/globals.css). */
export function eraVariables(look: EraLook): CSSProperties {
  return {
    "--paper": look.paper,
    "--card": look.card,
    "--ink": look.ink,
    "--soft": look.soft,
    "--line": look.line,
    "--accent": look.accent,
    "--on-accent": look.onAccent,
    "--tape": look.tape,
    "--era-font": look.font,
    "--era-font-weight": String(look.fontWeight ?? 400),
    "--era-font-style": look.fontItalic ? "italic" : "normal",
  } as CSSProperties;
}

/** The paper texture an Era's pages are printed on. */
export function paperOf(look?: EraLook): "grain" | "dark" | "plaid" {
  if (look?.plaid) return "plaid";

  return look?.dark ? "dark" : "grain";
}

const PAPER_CLASS = { grain: "paper-grain", dark: "paper-dark", plaid: "paper-plaid" } as const;

type EraScopeProps = ComponentPropsWithoutRef<"div"> & {
  /** The Era to apply; omitted, the neutral journal look. */
  era?: EraSlug;
  as?: "div" | "section" | "article" | "main" | "aside";
  /** Print the container on the Era's paper (grain, dark or plaid). Default true. */
  surface?: boolean;
};

/**
 * Applies an Era's look to everything inside: overrides the journal's colour
 * variables and display face on this container, with a colour fade when the
 * Era changes (instant under reduced motion). The Era's display face is only
 * downloaded once text inside uses `font-display`.
 */
export function EraScope({ era, as: Tag = "div", surface = true, className, style, ...props }: EraScopeProps) {
  const look = era ? ERA_LOOKS[era] : undefined;

  return (
    <Tag
      className={cn("era", surface && PAPER_CLASS[paperOf(look)], className)}
      data-era={era ?? "journal"}
      style={{ ...(look && eraVariables(look)), ...style }}
      {...props}
    />
  );
}
