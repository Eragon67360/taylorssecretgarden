"use client";

import * as React from "react";
import { NextUIProvider } from "@nextui-org/system";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";

export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const router = useRouter();

  return (
    <NextUIProvider navigate={router.push}>
      <ClerkProvider>
        <Toaster position="bottom-center" richColors />
        {children}
      </ClerkProvider>
    </NextUIProvider>
  );
}
