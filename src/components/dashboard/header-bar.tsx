"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderClosed, Layers, LogOut, Menu, Network, Plus, Search, Settings, UserRound } from "lucide-react";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/lib/sidebar-context";

interface HeaderBarProps {
  userId: string;
  userName: string;
}

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
 * The dashboard top bar: hamburger + brand mark on the left (toggles the
 * `AppSidebar` overlay drawer via `useSidebar`), search centered, "+ new"
 * dropdown and the avatar menu on the right. A three-column grid (rather
 * than flex-1 centering) keeps the search bar visually centered on the
 * bar regardless of how wide the left/right groups are. Search is a plain
 * link that routes to `/dashboard/search`, which owns its own input;
 * nothing here holds query text or fetches results itself.
 * @param props The signed-in user's id and display name.
 * @returns The rendered top bar.
 */
export function HeaderBar({ userId, userName }: HeaderBarProps): React.JSX.Element {
  const router = useRouter();
  const { toggle } = useSidebar();

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
    <header className="grid h-16 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-border bg-background px-6">
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          title="Toggle sidebar"
          onClick={toggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" title="Flowdeck" className="flex shrink-0 items-center">
          <Image src="/brand/icon-color.svg" alt="" width={28} height={28} className="h-7 w-7 rounded-md" />
        </Link>
      </div>

      <div className="flex justify-center">
        <Link
          href="/dashboard/search"
          title="Search"
          className="flex h-10 w-full max-w-md items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>Search…</span>
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
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
    </header>
  );
}
