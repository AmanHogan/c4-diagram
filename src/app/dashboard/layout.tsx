import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { HeaderBar } from "@/components/dashboard/header-bar";
import { ThemeApplier } from "@/components/theme/theme-applier";

/**
 * Authenticated dashboard shell: sidebar + header (search, new, avatar) +
 * scrollable content.
 * @param props Contains the page content as `children`.
 * @returns The dashboard layout.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  const session = await auth();

  return (
    <div className="flex h-screen overflow-hidden">
      <ThemeApplier />
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBar userId={session?.user?.id ?? ""} userName={session?.user?.name ?? "?"} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
