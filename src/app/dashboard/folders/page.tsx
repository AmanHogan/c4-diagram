"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderClosed, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteItemButton } from "@/components/library/delete-item-button";
import { ListPageHeader } from "@/components/library/list-page-header";
import { ListRowSkeletonStack } from "@/components/library/list-row-skeleton";
import { SortControl, type SortMode } from "@/components/library/sort-control";
import { EditFolderDetailsButton } from "@/components/library/edit-folder-details-button";
import { groupByRecency } from "@/lib/group-by-recency";
import { useDelayedLoading } from "@/lib/use-delayed-loading";

interface FolderSummary {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
}

/**
 * Lists the current user's folders with create/open actions.
 * @returns The rendered page.
 */
export default function FoldersPage(): React.JSX.Element {
  const router = useRouter();
  const [folders, setFolders] = useState<FolderSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const showSkeleton = useDelayedLoading(!folders);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const res = await fetch("/api/folders");
      const data = (await res.json()) as FolderSummary[];
      if (!cancelled) setFolders(data);
    };
    void load();
    return (): void => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (): Promise<void> => {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await res.json()) as { id: string };
    router.push(`/dashboard/folders/${data.id}`);
  };

  const handleDelete = async (id: string): Promise<void> => {
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    setFolders((prev) => prev?.filter((folder) => folder.id !== id) ?? prev);
  };

  const persist = useCallback((id: string, patch: Record<string, unknown>) => {
    return fetch(`/api/folders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }, []);

  const handleNameChange = useCallback(
    (id: string, name: string) => {
      setFolders((prev) => prev?.map((f) => (f.id === id ? { ...f, name } : f)) ?? prev);
      void persist(id, { name });
    },
    [persist],
  );

  const handleDescriptionChange = useCallback(
    (id: string, description: string) => {
      setFolders((prev) => prev?.map((f) => (f.id === id ? { ...f, description } : f)) ?? prev);
      void persist(id, { description });
    },
    [persist],
  );

  const sorted = useMemo(() => {
    if (!folders) return [];
    const copy = [...folders];
    if (sortMode === "name") copy.sort((a, b) => a.name.localeCompare(b.name));
    else copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return copy;
  }, [folders, sortMode]);

  const groups = useMemo(
    () => (sortMode === "recent" ? groupByRecency(sorted, (f) => f.updatedAt) : [{ label: "", items: sorted }]),
    [sorted, sortMode],
  );

  return (
    <div className="mx-auto max-w-3xl">
      <ListPageHeader
        title="Your folders."
        description="Group diagrams and flashcard sets together."
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

      {showSkeleton ? (
        <ListRowSkeletonStack />
      ) : !folders ? null : folders.length === 0 ? (
        <p className="text-base text-muted-foreground">No folders yet — create one to get started.</p>
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
                <ul className="flex flex-col gap-3">
                  {group.items.map((folder) => (
                    <li key={folder.id} className="group relative">
                      <a
                        href={`/dashboard/folders/${folder.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(`/dashboard/folders/${folder.id}`);
                        }}
                        className="flex min-w-0 items-center gap-4 rounded-xl border-2 border-border/60 bg-card px-5 py-4 pr-24 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-foreground">
                          <FolderClosed className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold">{folder.name}</p>
                          {folder.description ? (
                            <p className="mt-0.5 truncate text-sm text-muted-foreground">{folder.description}</p>
                          ) : null}
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            Updated {new Date(folder.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </a>
                      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
                        <EditFolderDetailsButton
                          name={folder.name}
                          onNameChange={(value) => handleNameChange(folder.id, value)}
                          description={folder.description ?? ""}
                          onDescriptionChange={(value) => handleDescriptionChange(folder.id, value)}
                        />
                        <DeleteItemButton
                          itemName={folder.name}
                          itemLabel="folder"
                          extraNote="Diagrams and flashcard sets inside it are kept, just moved out of the folder."
                          onDelete={() => handleDelete(folder.id)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
