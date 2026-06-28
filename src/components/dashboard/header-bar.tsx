"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";

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
 * Persistent dashboard header: a centered search bar, a "+ new" dropdown
 * (diagram / flashcard set / folder), and an avatar menu (public profile,
 * settings, sign out).
 * @param props The signed-in user's id and display name.
 * @returns The rendered header bar.
 */
export function HeaderBar({ userId, userName }: HeaderBarProps): React.JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const createMenuRef = useRef<HTMLDetailsElement>(null);
  const avatarMenuRef = useRef<HTMLDetailsElement>(null);

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleCreate = async (option: (typeof CREATE_OPTIONS)[number]): Promise<void> => {
    createMenuRef.current?.removeAttribute("open");
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
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-sidebar px-5">
      <button
        type="button"
        title="Dashboard"
        onClick={() => router.push("/dashboard")}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <LayoutDashboard className="h-5 w-5" />
      </button>

      <form onSubmit={handleSearch} className="mx-auto w-full max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search diagrams, flashcards, or people…"
            className="h-10 pl-9 text-base"
          />
        </div>
      </form>

      <details ref={createMenuRef} className="relative shrink-0">
        <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg text-muted-foreground marker:content-[''] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <Plus className="h-5 w-5" />
        </summary>
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border-2 border-border/60 bg-popover p-1.5 shadow-lg">
          {CREATE_OPTIONS.map((option) => (
            <button
              key={option.kind}
              type="button"
              onClick={() => void handleCreate(option)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-base hover:bg-accent"
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </button>
          ))}
        </div>
      </details>

      <details ref={avatarMenuRef} className="relative shrink-0">
        <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground marker:content-['']">
          {initial}
        </summary>
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border-2 border-border/60 bg-popover p-1.5 shadow-lg">
          <p className="truncate px-3 py-2 text-base font-semibold">{userName}</p>
          <button
            type="button"
            onClick={() => {
              avatarMenuRef.current?.removeAttribute("open");
              router.push(`/dashboard/users/${userId}`);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-base hover:bg-accent"
          >
            <UserRound className="h-4 w-4" /> View public profile
          </button>
          <button
            type="button"
            onClick={() => {
              avatarMenuRef.current?.removeAttribute("open");
              router.push("/dashboard/settings");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-base hover:bg-accent"
          >
            <Settings className="h-4 w-4" /> Settings
          </button>
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-base hover:bg-accent"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </details>
    </header>
  );
}
