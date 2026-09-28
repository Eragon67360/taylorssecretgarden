"use client";

import { LazyMotion, MotionConfig } from "motion/react";

import { afterLoad } from "@/lib/after-load";

// Motion's animation features (springs, gestures, exit and layout animations,
// ~30 KB) load once the page has loaded, off the critical path: nothing moves
// before then anyway. Components render the tiny `m` elements
// (motion/react-m); `strict` rejects a full `motion.*` element, which would
// bundle every feature up front.
const loadFeatures = () =>
  afterLoad()
    .then(() => import("@/lib/motion-features"))
    .then((mod) => mod.default);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // "user": transform and layout animations are skipped under reduced motion.
    <MotionConfig reducedMotion="user">
      <LazyMotion strict features={loadFeatures}>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
