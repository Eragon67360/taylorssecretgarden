"use client";

import * as React from "react";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { MotionConfig } from "motion/react";

export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ClerkProvider>
      {/* "user": transform and layout animations are skipped under reduced motion. */}
      <MotionConfig reducedMotion="user">
        <Toaster richColors position="bottom-center" />
        {children}
      </MotionConfig>
    </ClerkProvider>
  );
}
