import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

const TEXTURE = { grain: "paper-grain", dark: "paper-dark", plaid: "paper-plaid" } as const;
const TONE = { paper: "bg-paper text-ink", card: "bg-card text-ink", kraft: "bg-kraft text-[#2b1d14]" } as const;

type PaperProps = ComponentPropsWithoutRef<"div"> & {
  as?: "div" | "section" | "article" | "aside" | "header" | "footer";
  /** Texture: fine grain (default), a darker grain for dark Eras, or evermore's flannel plaid. */
  variant?: keyof typeof TEXTURE;
  /** Colour: the page's paper (default), the lighter card, or brown kraft paper. */
  tone?: keyof typeof TONE;
};

/** A sheet of paper: a textured surface in the current Era's colours. */
export function Paper({ as: Tag = "div", variant = "grain", tone = "paper", className, ...props }: PaperProps) {
  return <Tag className={cn(TONE[tone], TEXTURE[variant], className)} {...props} />;
}
