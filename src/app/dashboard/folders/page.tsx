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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Folders</h1>
          <p className="text-sm text-muted-foreground">Group diagrams and flashcard sets together.</p>
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

      {!folders ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : folders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No folders yet — create one to get started.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {folders.map((folder) => (
            <li key={folder.id}>
              <Link
                href={`/dashboard/folders/${folder.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:border-primary"
              >
                <FolderClosed className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{folder.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
