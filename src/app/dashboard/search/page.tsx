"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Globe, Lock, Network, Layers, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchDiagram {
  id: string;
  name: string;
  visibility: "public" | "private";
  ownerName: string;
  isOwner: boolean;
  updatedAt: string;
}

interface SearchFlashcardSet {
  id: string;
  name: string;
  description?: string;
  visibility: "public" | "private";
  ownerName: string;
  isOwner: boolean;
  cardCount: number;
  updatedAt: string;
}

interface SearchUser {
  id: string;
  name: string;
}

interface SearchResults {
  diagrams: SearchDiagram[];
  flashcardSets: SearchFlashcardSet[];
  users: SearchUser[];
}

type Tab = "diagrams" | "flashcards" | "users";

function VisibilityTag({ visibility }: { visibility: "public" | "private" }): React.JSX.Element {
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {visibility === "public" ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      {visibility === "public" ? "Public" : "Private"}
    </span>
  );
}

/**
 * Search results page: "Results for X" with Diagrams / Flashcards / Users
 * tabs underneath, each clickable through to its detail page.
 * @returns The rendered page.
 */
export default function SearchPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [results, setResults] = useState<SearchResults | null>(null);
  const [tab, setTab] = useState<Tab>("diagrams");

  useEffect(() => {
    if (!q) return;
    let cancelled = false;
    const load = async (): Promise<void> => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as SearchResults;
      if (!cancelled) setResults(data);
    };
    void load();
    return (): void => {
      cancelled = true;
    };
  }, [q]);

  const counts = {
    diagrams: results?.diagrams.length ?? 0,
    flashcards: results?.flashcardSets.length ?? 0,
    users: results?.users.length ?? 0,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-3xl font-bold">
        Results for <span className="text-muted-foreground">&quot;{q}&quot;</span>
      </h1>

      <div className="mb-6 flex items-center gap-1 border-b">
        {(
          [
            ["diagrams", "Diagrams"],
            ["flashcards", "Flashcards"],
            ["users", "Users"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-base font-medium transition-colors",
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {!q ? (
        <p className="text-base text-muted-foreground">Type something in the search bar to get started.</p>
      ) : !results ? (
        <p className="text-base text-muted-foreground">Searching…</p>
      ) : (
        <>
          {tab === "diagrams" ? (
            results.diagrams.length === 0 ? (
              <p className="text-base text-muted-foreground">No diagrams found.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {results.diagrams.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/dashboard/diagram/${d.id}`}
                      className="flex items-center gap-4 rounded-xl border-2 border-border/60 bg-card px-5 py-4 hover:border-primary"
                    >
                      <Network className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold">{d.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {d.isOwner ? "You" : d.ownerName}
                        </p>
                      </div>
                      <VisibilityTag visibility={d.visibility} />
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {tab === "flashcards" ? (
            results.flashcardSets.length === 0 ? (
              <p className="text-base text-muted-foreground">No flashcard sets found.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {results.flashcardSets.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/dashboard/flashcards/${s.id}`}
                      className="flex items-center gap-4 rounded-xl border-2 border-border/60 bg-card px-5 py-4 hover:border-primary"
                    >
                      <Layers className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold">{s.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {s.isOwner ? "You" : s.ownerName} · {s.cardCount} cards
                        </p>
                      </div>
                      <VisibilityTag visibility={s.visibility} />
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {tab === "users" ? (
            results.users.length === 0 ? (
              <p className="text-base text-muted-foreground">No users found.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {results.users.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/dashboard/users/${u.id}`}
                      className="flex items-center gap-4 rounded-xl border-2 border-border/60 bg-card px-5 py-4 hover:border-primary"
                    >
                      <UserIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <span className="text-base font-semibold">{u.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </>
      )}
    </div>
  );
}
