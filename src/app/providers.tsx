"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

/**
 * Client providers wrapper (NextAuth session context, toast notifications).
 * @param props Contains the app tree as `children`.
 * @returns The children wrapped in client-side providers.
 */
export function Providers({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <SessionProvider>
      {children}
      <Toaster theme="dark" position="bottom-right" />
    </SessionProvider>
  );
}
