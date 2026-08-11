"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListPageHeader } from "@/components/library/list-page-header";
import { ListItemRow } from "@/components/library/list-item-row";
import { ListRowSkeletonStack } from "@/components/library/list-row-skeleton";
import { SortControl, type SortMode } from "@/components/library/sort-control";
import { groupByRecency } from "@/lib/group-by-recency";
import { useDelayedLoading } from "@/lib/use-delayed-loading";

export interface LibraryItem {
  id: string;
  name: string;
  description?: string;
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
  /** Noun used in the delete confirmation dialog, e.g. "diagram". */
  itemLabel: string;
}

function metaFor(item: LibraryItem): string {
  const updated = `Updated ${new Date(item.updatedAt).toLocaleDateString()}`;
  return item.cardCount !== undefined ? `${item.cardCount} card${item.cardCount === 1 ? "" : "s"} · ${updated}` : updated;
}

/**
 * Generic "my items" list page: fetches from `listUrl`, supports creating a
 * new item (POST to `createUrl` then navigate to its detail page), sorting
 * by name or recency (recency grouped into "This week" then month buckets),
 * and links each row to `detailHref`. Shared by the diagrams and flashcard
 * set list pages since both have the same id/name/visibility/updatedAt shape.
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
  itemLabel,
}: LibraryListPageProps): React.JSX.Element {
  const router = useRouter();
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const showSkeleton = useDelayedLoading(!items);

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

  const handleDelete = async (id: string): Promise<void> => {
    await fetch(`${listUrl}/${id}`, { method: "DELETE" });
    setItems((prev) => prev?.filter((item) => item.id !== id) ?? prev);
  };

  const sorted = useMemo(() => {
    if (!items) return [];
    const copy = [...items];
    if (sortMode === "name") copy.sort((a, b) => a.name.localeCompare(b.name));
    else copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return copy;
  }, [items, sortMode]);

  const groups = useMemo(
    () => (sortMode === "recent" ? groupByRecency(sorted, (i) => i.updatedAt) : [{ label: "", items: sorted }]),
    [sorted, sortMode],
  );

  const renderRow = (item: LibraryItem): React.JSX.Element => (
    <ListItemRow
      key={item.id}
      href={detailHref(item.id)}
      icon={item.cardCount !== undefined ? BookOpen : Workflow}
      title={item.name}
      description={item.description}
      meta={metaFor(item)}
      visibility={item.visibility}
      itemLabel={itemLabel}
      onDelete={() => handleDelete(item.id)}
    />
  );

  return (
    <div className="mx-auto max-w-3xl">
      <ListPageHeader
        title={title}
        description={description}
        action={
          creating ? (
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
          )
        }
      />

      {error ? <p className="mb-4 text-base text-destructive">{error}</p> : null}

      {showSkeleton ? (
        <ListRowSkeletonStack />
      ) : !items ? null : items.length === 0 ? (
        <p className="text-base text-muted-foreground">{emptyLabel}</p>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <SortControl value={sortMode} onChange={setSortMode} />
          </div>
          <div className="flex flex-col gap-7">
            {groups.map((group) => (
              <div key={group.label || "all"}>
                {group.label ? (
                  <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </h2>
                ) : null}
                <ul className="flex flex-col gap-3">{group.items.map(renderRow)}</ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
