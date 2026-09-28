import type { CSSProperties } from "react";

import { sanitisePostHtml } from "@/service/post-html";
import { cn } from "@/lib/utils";

type PostContentProps = { content: string; className?: string; style?: CSSProperties };

/**
 * A Post's HTML. Posts are sanitised when they are published; sanitising again
 * on render keeps rows written any other way from running scripts in the
 * browser. Formatting styles: `.post-content` in styles/globals.css.
 */
export function PostContent({ content, className, style }: PostContentProps) {
  return <div dangerouslySetInnerHTML={{ __html: sanitisePostHtml(content) }} className={cn("post-content", className)} style={style} />;
}
