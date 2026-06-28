"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderClosed,
  LayoutDashboard,
  Layers,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
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
 * Application sidebar with the top-level navigation links. Starts collapsed
 * to a slim icon rail on every load, maximizing room for content; expand with
 * the rail's toggle button.
 * @returns The rendered sidebar nav.
 */
export function AppSidebar(): React.JSX.Element {
  const pathname = usePathname();
  const { width, onPointerDown } = useResizableWidth(256, 180, 420, "right");
  const [collapsed, setCollapsed] = useState(true);

  if (collapsed) {
    return (
      <div className="flex h-full w-12 shrink-0 flex-col items-center gap-1 border-r bg-sidebar py-3 text-sidebar-foreground">
        <button
          type="button"
          title="Expand sidebar"
          onClick={() => setCollapsed(false)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <div className="my-1 h-px w-6 bg-sidebar-border" />
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive(pathname, href) && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <aside
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground"
    >
      <div className="flex items-start justify-between gap-2 border-b px-4 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Learn Workspace</p>
          <p className="truncate text-xs text-muted-foreground">Diagrams & flashcards</p>
        </div>
        <button
          type="button"
          title="Collapse sidebar"
          onClick={() => setCollapsed(true)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
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
