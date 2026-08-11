"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FolderClosed,
  LayoutDashboard,
  Layers,
  LogOut,
  Network,
  Plus,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderBarProps {
  userId: string;
  userName: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof Network;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Diagrams", href: "/dashboard/diagrams", icon: Network },
  { label: "Flashcards", href: "/dashboard/flashcards", icon: Layers },
  { label: "Folders", href: "/dashboard/folders", icon: FolderClosed },
];

type CreateKind = "diagram" | "flashcard-set" | "folder";

const CREATE_OPTIONS: {
  kind: CreateKind;
  label: string;
  icon: typeof Network;
  createUrl: string;
  detailHref: (id: string) => string;
}[] = [
  {
    kind: "diagram",
    label: "Diagram",
    icon: Network,
    createUrl: "/api/diagrams",
    detailHref: (id) => `/dashboard/diagram/${id}`,
  },
  {
    kind: "flashcard-set",
    label: "Flashcard set",
    icon: Layers,
    createUrl: "/api/flashcards",
    detailHref: (id) => `/dashboard/flashcards/${id}`,
  },
  {
    kind: "folder",
    label: "Folder",
    icon: FolderClosed,
    createUrl: "/api/folders",
    detailHref: (id) => `/dashboard/folders/${id}`,
  },
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
 * The entire dashboard chrome: a single top nav bar (brand mark, horizontal
 * nav links, search, "+ new" dropdown, avatar menu) — there is no sidebar.
 * Search is a plain button that routes to `/dashboard/search`, which owns
 * its own input; nothing here holds query text or fetches results itself.
 * @param props The signed-in user's id and display name.
 * @returns The rendered top nav.
 */
export function HeaderBar({ userId, userName }: HeaderBarProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();

  const handleCreate = async (option: (typeof CREATE_OPTIONS)[number]): Promise<void> => {
    const name = window.prompt(`Name your new ${option.label.toLowerCase()}`);
    if (!name || !name.trim()) return;
    const res = await fetch(option.createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { id: string };
    router.push(option.detailHref(data.id));
  };

  const initial = userName.charAt(0).toUpperCase() || "?";

  return (
    <header className="flex h-16 shrink-0 items-center gap-6 border-b border-border bg-background px-6">
      <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
        <Image src="/brand/icon-color.svg" alt="" width={28} height={28} className="h-7 w-7 rounded-md" />
        <span className="hidden text-base font-bold sm:inline">Flowdeck</span>
      </Link>

      <nav className="hidden items-center gap-1 md:flex">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(pathname, href)
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <Link
          href="/dashboard/search"
          title="Search"
          className="flex h-10 w-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground lg:w-72 lg:justify-start"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden lg:inline">Search…</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="New"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Plus className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {CREATE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.kind}
                onClick={() => void handleCreate(option)}
                className="gap-3 py-2.5 text-base"
              >
                <option.icon className="h-4 w-4" />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-semibold text-white"
            >
              {initial}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <p className="truncate px-2 py-2 text-base font-semibold">{userName}</p>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push(`/dashboard/users/${userId}`)}
              className="gap-3 py-2.5 text-base"
            >
              <UserRound className="h-4 w-4" /> View public profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings")}
              className="gap-3 py-2.5 text-base"
            >
              <Settings className="h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void signOut({ callbackUrl: "/login" })}
              className="gap-3 py-2.5 text-base"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile nav: icon-only row under the bar's items, since the labeled
          links above hide below md. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background py-2 md:hidden">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              isActive(pathname, href) ? "bg-accent text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
          </Link>
        ))}
      </nav>
    </header>
  );
}
