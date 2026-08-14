"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderClosed, LayoutDashboard, Layers, Network, PanelLeftClose, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResizableWidth } from "@/lib/use-resizable-width";
import { useSidebar } from "@/lib/sidebar-context";

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
 * The nav drawer: hidden by default, toggled open by the hamburger button
 * in `HeaderBar` (shared via `useSidebar`). Slides in as a fixed overlay
 * from the left, above everything including the top bar — it does not
 * push content or reserve layout space when closed. A click on the
 * backdrop, or on any nav link, closes it.
 * @returns The rendered drawer (and its backdrop, when open).
 */
export function AppSidebar(): React.JSX.Element {
  const pathname = usePathname();
  const { width, onPointerDown } = useResizableWidth(256, 200, 420, "right");
  const { open, close } = useSidebar();

  return (
    <>
      <div
        aria-hidden
        onClick={close}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        style={{ width }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden border-r border-border bg-background text-foreground transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 px-4 py-4">
          <Image src="/brand/icon-color.svg" alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-lg" />
          <p className="min-w-0 flex-1 truncate text-sm font-bold">Flowdeck</p>
          <button
            type="button"
            title="Collapse sidebar"
            onClick={close}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(pathname, href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          ))}
        </nav>

        <div
          onPointerDown={onPointerDown}
          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40"
        />
      </aside>
    </>
  );
}
