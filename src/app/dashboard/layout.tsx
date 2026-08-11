import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { HeaderBar } from "@/components/dashboard/header-bar";
import { PageGlow } from "@/components/dashboard/page-glow";

/**
 * Authenticated dashboard shell: a single top nav bar (brand, nav links,
 * search, new, avatar — no sidebar), a fixed decorative corner glow behind
 * everything, plus scrollable content. `pb-16`/`md:pb-0` on `main` leaves
 * room for the header's fixed mobile icon-nav strip.
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
    <div className="flex h-screen flex-col overflow-hidden">
      <PageGlow />
      <HeaderBar userId={session?.user?.id ?? ""} userName={session?.user?.name ?? "?"} />
      <main className="flex-1 overflow-auto p-6 pb-16 md:pb-6">{children}</main>
    </div>
  );
}
