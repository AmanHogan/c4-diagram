"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderClosed, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FolderSummary {
  id: string;
  name: string;
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Folders</h1>
          <p className="text-base text-muted-foreground">Group diagrams and flashcard sets together.</p>
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

      {!folders ? (
        <p className="text-base text-muted-foreground">Loading…</p>
      ) : folders.length === 0 ? (
        <p className="text-base text-muted-foreground">No folders yet — create one to get started.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {folders.map((folder) => (
            <li key={folder.id}>
              <Link
                href={`/dashboard/folders/${folder.id}`}
                className="flex items-center gap-4 rounded-xl border-2 border-border/60 bg-card px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <FolderClosed className="h-5 w-5" />
                </span>
                <span className="text-base font-semibold">{folder.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
