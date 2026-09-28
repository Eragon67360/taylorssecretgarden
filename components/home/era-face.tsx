"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Text set in the surrounding Era's display face, but only once it is about
 * to scroll into view: until then it is set in the journal serif, so a page
 * showing many Eras downloads a face only for the Eras the visitor reaches.
 */
export function EraFace({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: "300px 0px" },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <span ref={ref} className={cn(near ? "font-display" : "font-serif font-semibold", className)}>
      {children}
    </span>
  );
}
