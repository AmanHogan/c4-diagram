"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe, Lock, Network, Layers, Search as SearchIcon, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Marquee } from "@/components/ui/marquee";
import { PosterCard } from "@/components/dashboard/vertical-item-card";
import { PosterCardSkeletonRow } from "@/components/dashboard/poster-card-skeleton";
import { ListRowSkeletonStack } from "@/components/library/list-row-skeleton";
import { cn } from "@/lib/utils";
import { useRefetchOnFocus } from "@/lib/use-refetch-on-focus";
import { useDelayedLoading } from "@/lib/use-delayed-loading";
import { ctaLabelFor, iconFor, itemHref, type DashboardItem } from "@/lib/dashboard-item";

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
 * Search page: owns its own input (there's no search bar in the top nav
 * anymore — that's just a button that links here) plus "Results for X" with
 * Diagrams / Flashcards / Users tabs underneath, each clickable through to
 * its detail page.
 * @returns The rendered page.
 */
export default function SearchPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [tab, setTab] = useState<Tab>("diagrams");
  const [popular, setPopular] = useState<DashboardItem[] | null>(null);

  // Keep the input in sync if the URL changes some other way (back/forward).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(q);
  }, [q]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const next = draft.trim();
    router.push(next ? `/dashboard/search?q=${encodeURIComponent(next)}` : "/dashboard/search");
  };

  const requestIdRef = useRef(0);

  // Refetches whenever `q` changes AND whenever the tab regains
  // focus/visibility — so if the query still matches something you just
  // flipped to public on another tab, you don't need a hard reload to see
  // it show up here.
  const load = useCallback(async (): Promise<void> => {
    if (!q) {
      setResults(null);
      return;
    }
    const requestId = ++requestIdRef.current;
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data: SearchResults = res.ok
      ? ((await res.json()) as SearchResults)
      : { diagrams: [], flashcardSets: [], users: [] };
    if (requestIdRef.current === requestId) setResults(data);
  }, [q]);
  useRefetchOnFocus(load);

  // Independent of the search query — shown as an "explore" strip whenever
  // there's nothing to show results for yet, same data/cards as the
  // dashboard's "See what other learners are exploring." section.
  const loadPopular = useCallback(async (): Promise<void> => {
    const res = await fetch("/api/dashboard");
    if (!res.ok) return;
    const data = (await res.json()) as { popular: DashboardItem[] };
    setPopular(data.popular);
  }, []);
  useRefetchOnFocus(loadPopular);

  const showResultsSkeleton = useDelayedLoading(!!q && !results);
  const showPopularSkeleton = useDelayedLoading(!popular);

  const counts = {
    diagrams: results?.diagrams.length ?? 0,
    flashcards: results?.flashcardSets.length ?? 0,
    users: results?.users.length ?? 0,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-3xl font-bold">Search</h1>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search diagrams, flashcards, or people…"
            className="h-11 pl-9 text-base"
          />
        </div>
      </form>

      {q ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Results for <span className="font-medium text-foreground">&quot;{q}&quot;</span>
        </p>
      ) : null}

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
        <div>
          <p className="mb-8 text-base text-muted-foreground">Type something in the search bar to get started.</p>
          <div className="text-center">
            <h2 className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
              See what other learners are exploring.
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              Public diagrams and flashcard sets from across Flowdeck.
            </p>
          </div>
          <div className="mt-6">
            {showPopularSkeleton ? (
              <PosterCardSkeletonRow />
            ) : !popular ? null : popular.length === 0 ? (
              <p className="text-center text-base text-muted-foreground">No public sets or diagrams yet.</p>
            ) : (
              <Marquee pauseOnHover className="[--duration:70s]">
                {popular.map((item) => (
                  <PosterCard
                    key={`${item.type}-${item.id}`}
                    href={itemHref(item)}
                    icon={iconFor(item.type)}
                    coverImageUrl={item.coverImageUrl}
                    title={item.name}
                    description={item.description}
                    date={new Date(item.updatedAt).toLocaleDateString()}
                    ctaLabel={ctaLabelFor(item.type)}
                  />
                ))}
              </Marquee>
            )}
          </div>
        </div>
      ) : showResultsSkeleton ? (
        <ListRowSkeletonStack count={3} />
      ) : !results ? null : (
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
