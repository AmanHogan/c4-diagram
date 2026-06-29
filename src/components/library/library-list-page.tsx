"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, Layers, Lock, Network, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface LibraryItem {
  id: string;
  name: string;
  visibility: "public" | "private";
  updatedAt: string;
  cardCount?: number;
}

interface LibraryListPageProps {
  title: string;
  description: string;
  listUrl: string;
  createUrl: string;
  detailHref: (id: string) => string;
  emptyLabel: string;
}

/**
 * Generic "my items" list page: fetches from `listUrl`, supports creating a
 * new item (POST to `createUrl` then navigate to its detail page), and links
 * each row to `detailHref`. Shared by the diagrams and flashcard set list
 * pages since both have the same id/name/visibility/updatedAt shape.
 * @param props Page copy plus the API endpoints and routing for this item type.
 * @returns The rendered list page.
 */
export function LibraryListPage({
  title,
  description,
  listUrl,
  createUrl,
  detailHref,
  emptyLabel,
}: LibraryListPageProps): React.JSX.Element {
  const router = useRouter();
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const res = await fetch(listUrl);
      const data = (await res.json()) as LibraryItem[];
      if (!cancelled) setItems(data);
    };
    void load();
    return (): void => {
      cancelled = true;
    };
  }, [listUrl]);

  const handleCreate = async (): Promise<void> => {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Could not create");
      return;
    }
    const data = (await res.json()) as { id: string };
    router.push(detailHref(data.id));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-base text-muted-foreground">{description}</p>
        </div>
        {creating ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              autoFocus
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
                if (e.key === "Escape") setCreating(false);
              }}
              className="h-10 w-52 text-base"
            />
            <Button size="lg" onClick={() => void handleCreate()} className="text-base">
              Create
            </Button>
            <Button size="lg" variant="ghost" onClick={() => setCreating(false)} className="text-base">
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="lg" onClick={() => setCreating(true)} className="text-base">
            <Plus className="h-5 w-5" /> New
          </Button>
        )}
      </div>

      {error ? <p className="mb-4 text-base text-destructive">{error}</p> : null}

      {!items ? (
        <p className="text-base text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-base text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={detailHref(item.id)}
                className="flex items-center justify-between gap-4 rounded-xl border-2 border-border/60 bg-card px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                    {item.cardCount !== undefined ? (
                      <Layers className="h-5 w-5" />
                    ) : (
                      <Network className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.cardCount !== undefined ? `${item.cardCount} cards · ` : ""}
                      Updated {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                  {item.visibility === "public" ? (
                    <Globe className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {item.visibility === "public" ? "Public" : "Private"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
