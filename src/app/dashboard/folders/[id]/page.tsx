"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Layers, Lock, Network } from "lucide-react";

interface FolderItem {
  id: string;
  name: string;
  visibility: "public" | "private";
  updatedAt: string;
  cardCount?: number;
}

interface FolderDetail {
  id: string;
  name: string;
  diagrams: FolderItem[];
  flashcardSets: FolderItem[];
}

interface FolderPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Folder detail page: shows the diagrams and flashcard sets filed under it.
 * @param props Route params containing the folder's id.
 * @returns The rendered page.
 */
export default function FolderPage({ params }: FolderPageProps): React.JSX.Element {
  const { id } = use(params);
  const [folder, setFolder] = useState<FolderDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const res = await fetch(`/api/folders/${id}`);
      if (res.status === 404) {
        if (!cancelled) setNotFound(true);
        return;
      }
      const data = (await res.json()) as FolderDetail;
      if (!cancelled) setFolder(data);
    };
    void load();
    return (): void => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    return <div className="mx-auto max-w-2xl text-sm text-muted-foreground">Folder not found.</div>;
  }
  if (!folder) {
    return <div className="mx-auto max-w-2xl text-sm text-muted-foreground">Loading…</div>;
  }

  const isEmpty = folder.diagrams.length === 0 && folder.flashcardSets.length === 0;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">{folder.name}</h1>

      {isEmpty ? (
        <p className="text-sm text-muted-foreground">
          Nothing in this folder yet — assign a diagram or flashcard set to it from its own page.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {folder.diagrams.map((d) => (
            <li key={`diagram-${d.id}`}>
              <Link
                href={`/dashboard/diagram/${d.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:border-primary"
              >
                <Network className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm font-medium">{d.name}</span>
                {d.visibility === "public" ? (
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Link>
            </li>
          ))}
          {folder.flashcardSets.map((s) => (
            <li key={`flashcard-${s.id}`}>
              <Link
                href={`/dashboard/flashcards/${s.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:border-primary"
              >
                <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm font-medium">{s.name}</span>
                {s.visibility === "public" ? (
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
