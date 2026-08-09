"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FolderClosed,
  LayoutDashboard,
  Layers,
  Menu,
  Network,
  PanelLeftClose,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useResizableWidth } from "@/lib/use-resizable-width";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Diagrams", href: "/dashboard/diagrams", icon: Network },
  { label: "Flashcards", href: "/dashboard/flashcards", icon: Layers },
  { label: "Folders", href: "/dashboard/folders", icon: FolderClosed },
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
 * Application sidebar: a permanent icon rail (brand mark + expand toggle +
 * nav icons) that widens in place to show labels when expanded. Starts
 * collapsed on every load. Shares its background with the header bar
 * (both use `bg-sidebar`) so there's no visible seam between them.
 * @returns The rendered sidebar nav.
 */
export function AppSidebar(): React.JSX.Element {
  const pathname = usePathname();
  const { width, onPointerDown } = useResizableWidth(256, 180, 420, "right");
  const [collapsed, setCollapsed] = useState(true);
  const { data: session } = useSession();

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <aside
      style={{ width: collapsed ? 48 : width }}
      className="relative flex h-full shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out"
    >
      <div className={cn("flex items-center gap-3 py-4", collapsed ? "flex-col px-0" : "px-4")}>
        <Link
          href="/dashboard"
          title="Flowdeck"
          className={cn("flex shrink-0 items-center justify-center", collapsed ? "h-9 w-9" : "")}
        >
          <Image
            src="/brand/icon-color.svg"
            alt=""
            width={40}
            height={40}
            className={cn("rounded-lg transition-all duration-200", collapsed ? "h-8 w-8" : "h-10 w-10")}
          />
        </Link>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">Flowdeck</p>
          </div>
        ) : null}
        <button
          type="button"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed ? "mt-1 h-8 w-8" : "h-7 w-7",
          )}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {collapsed ? <div className="mx-auto my-1 h-px w-6 bg-sidebar-border" /> : null}

      <nav
        className={cn(
          "flex-1 space-y-1 overflow-y-auto py-2",
          collapsed ? "flex flex-col items-center px-0" : "px-3 py-4",
        )}
      >
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center rounded-lg transition-colors",
              collapsed ? "h-8 w-8 justify-center" : "gap-3 px-3 py-2.5 text-sm font-medium",
              isActive(pathname, href)
                ? "bg-blue-600/10 text-blue-400"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className={collapsed ? "h-4 w-4" : "h-[18px] w-[18px] shrink-0"} />
            {!collapsed ? <span className="whitespace-nowrap">{label}</span> : null}
          </Link>
        ))}
      </nav>

      <div className={cn("mt-auto border-t border-sidebar-border", collapsed ? "border-t-0 pb-1" : "p-4")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {initials}
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session?.user?.name ?? "User"}</p>
              <p className="truncate text-xs text-muted-foreground">{session?.user?.email ?? ""}</p>
            </div>
          ) : null}
        </div>
      </div>

      {!collapsed ? (
        <div
          onPointerDown={onPointerDown}
          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40"
        />
      ) : null}
    </aside>
  );
}
