"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Network, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResizableWidth } from "@/lib/use-resizable-width";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Diagram", href: "/dashboard/diagram", icon: Network },
];

/**
 * Determine whether a nav href is the active route.
 * @param pathname The current pathname.
 * @param href The nav item href.
 * @returns True when the href matches the active route.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Application sidebar with the top-level navigation links.
 * @returns The rendered sidebar nav.
 */
export function AppSidebar(): React.JSX.Element {
  const pathname = usePathname();
  const { width, onPointerDown } = useResizableWidth(256, 180, 420, "right");

  return (
    <aside
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground"
    >
      <div className="border-b px-4 py-4">
        <p className="text-sm font-semibold">Infra Diagram</p>
        <p className="text-xs text-muted-foreground">Model the k3s platform</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive(pathname, href) &&
                    "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div
        onPointerDown={onPointerDown}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40"
      />
    </aside>
  );
}
