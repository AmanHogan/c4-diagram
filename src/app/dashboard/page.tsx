"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Layers, Network, Sparkles } from "lucide-react";

interface DashboardItem {
  type: "diagram" | "flashcard-set";
  id: string;
  name: string;
  ownerName?: string;
  updatedAt: string;
}

function itemHref(item: DashboardItem): string {
  return item.type === "diagram" ? `/dashboard/diagram/${item.id}` : `/dashboard/flashcards/${item.id}`;
}

/**
 * A card linking to a recent or popular diagram/flashcard set.
 * @param props The item to render and whether to show its owner's name.
 * @returns The rendered card.
 */
function ItemCard({ item, showOwner }: { item: DashboardItem; showOwner: boolean }): React.JSX.Element {
  const Icon = item.type === "diagram" ? Network : Layers;
  return (
    <Link
      href={itemHref(item)}
      className="flex items-center gap-4 rounded-xl border-2 border-border/60 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold">{item.name}</p>
        <p className="truncate text-sm text-muted-foreground">
          {showOwner && item.ownerName ? `by ${item.ownerName} · ` : ""}
          {new Date(item.updatedAt).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}

/**
 * Dashboard landing page: "Jump back in" (the user's own recent items,
 * private) and "Popular with other learners" (public items from anyone),
 * each in its own clearly separated, darker-outlined section.
 * @returns The rendered dashboard home.
 */
export default function DashboardHome(): React.JSX.Element {
  const [recent, setRecent] = useState<DashboardItem[] | null>(null);
  const [popular, setPopular] = useState<DashboardItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const res = await fetch("/api/dashboard");
      const data = (await res.json()) as { recent: DashboardItem[]; popular: DashboardItem[] };
      if (!cancelled) {
        setRecent(data.recent);
        setPopular(data.popular);
      }
    };
    void load();
    return (): void => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-3xl font-bold">Dashboard</h1>
      <p className="mb-8 text-base text-muted-foreground">
        Pick up where you left off, or see what other learners are studying.
      </p>

      <section className="mb-6 rounded-2xl border-2 border-sidebar-border bg-sidebar/60 p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
            <Compass className="h-5 w-5" />
          </span>
          <h2 className="text-xl font-bold tracking-tight">Jump back in</h2>
        </div>
        {!recent ? (
          <p className="text-base text-muted-foreground">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-base text-muted-foreground">
            Nothing yet — create a diagram or flashcard set to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recent.map((item) => (
              <ItemCard key={`${item.type}-${item.id}`} item={item} showOwner={false} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border-2 border-sidebar-border bg-sidebar/60 p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <Sparkles className="h-5 w-5" />
          </span>
          <h2 className="text-xl font-bold tracking-tight">Popular with other learners</h2>
        </div>
        {!popular ? (
          <p className="text-base text-muted-foreground">Loading…</p>
        ) : popular.length === 0 ? (
          <p className="text-base text-muted-foreground">No public sets or diagrams yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {popular.map((item) => (
              <ItemCard key={`${item.type}-${item.id}`} item={item} showOwner />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
