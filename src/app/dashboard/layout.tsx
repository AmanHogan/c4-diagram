import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { HeaderBar } from "@/components/dashboard/header-bar";
import { PageGlow } from "@/components/dashboard/page-glow";
import { SidebarProvider } from "@/lib/sidebar-context";

/**
 * Authenticated dashboard shell: a top bar (hamburger + brand, centered
 * search, new, avatar) above scrollable content. The nav drawer
 * (`AppSidebar`) is an overlay toggled from the top bar's hamburger button
 * — it doesn't reserve layout space, so this is a single column, not a
 * sidebar-plus-content split. A fixed decorative corner glow sits behind
 * everything.
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
    <SidebarProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <PageGlow />
        <AppSidebar />
        <HeaderBar userId={session?.user?.id ?? ""} userName={session?.user?.name ?? "?"} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </SidebarProvider>
  );
}
