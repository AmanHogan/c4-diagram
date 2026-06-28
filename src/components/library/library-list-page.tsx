"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, Lock, Plus } from "lucide-react";
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {creating ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
                if (e.key === "Escape") setCreating(false);
              }}
              className="h-8 w-44"
            />
            <Button size="sm" onClick={() => void handleCreate()}>
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
        )}
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      {!items ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={detailHref(item.id)}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:border-primary"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.cardCount !== undefined ? `${item.cardCount} cards · ` : ""}
                    Updated {new Date(item.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  {item.visibility === "public" ? (
                    <Globe className="h-3.5 w-3.5" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
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
