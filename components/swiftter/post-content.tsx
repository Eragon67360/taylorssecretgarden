import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

type PostContentProps = { content: string; className?: string; style?: CSSProperties };

/**
 * A Post's HTML, as the feed API serves it: sanitised on the server when
 * published and again when read (toFeedPost in service/swiftter.ts), so rows
 * written any other way cannot run scripts here either. Formatting styles:
 * `.post-content` in styles/globals.css.
 */
export function PostContent({ content, className, style }: PostContentProps) {
  // dir="auto" and, per paragraph, `unicode-bidi: plaintext` (globals.css): right-to-left text reads right.
  return <div dangerouslySetInnerHTML={{ __html: content }} className={cn("post-content", className)} dir="auto" style={style} />;
}
