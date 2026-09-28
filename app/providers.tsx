"use client";

import * as React from "react";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";

export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ClerkProvider>
      <Toaster richColors position="bottom-center" />
      {children}
    </ClerkProvider>
  );
}
