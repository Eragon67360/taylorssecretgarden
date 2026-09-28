import type { ComponentPropsWithoutRef } from "react";

import { PAPER_TEXTURE } from "@/components/scrapbook/paper";
import { ERA_LOOKS, type EraSlug, eraVariables, paperTexture } from "@/lib/eras";
import { cn } from "@/lib/utils";

type EraScopeProps = ComponentPropsWithoutRef<"div"> & {
  /** The Era to apply; omitted, the neutral journal look. */
  era?: EraSlug;
  as?: "div" | "section" | "article";
};

/**
 * Applies an Era's look to everything inside: overrides the journal's colour
 * variables and display face on this container, printed on the Era's paper,
 * with a colour fade when the Era changes (instant under reduced motion). The
 * Era's display face is only downloaded once text inside uses `font-display`.
 */
export function EraScope({ era, as: Tag = "div", className, style, ...props }: EraScopeProps) {
  const look = era ? ERA_LOOKS[era] : undefined;

  return (
    <Tag
      className={cn("era", PAPER_TEXTURE[paperTexture(look)], className)}
      data-era={era ?? "journal"}
      style={{ ...(look && eraVariables(look)), ...style }}
      {...props}
    />
  );
}
