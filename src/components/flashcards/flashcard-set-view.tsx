"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  FileDown,
  GitFork,
  Globe,
  Lock,
  Plus,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FolderPicker } from "@/components/library/folder-picker";
import { MarkdownContent } from "@/components/flashcards/markdown-content";
import { cn } from "@/lib/utils";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

type CardStatus = "known" | "learning";

interface FlashcardSetApiResponse {
  id: string;
  name: string;
  description?: string;
  visibility: "public" | "private";
  folderId: string | null;
  cards: Flashcard[];
  isOwner: boolean;
  ownerName: string;
}

interface FlashcardSetViewProps {
  setId: string;
}

function newCard(): Flashcard {
  return { id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, front: "", back: "" };
}

function swapKey(setId: string): string {
  return `flashcards:${setId}:swapped`;
}

/**
 * Flashcard set page: owners get a full editor (rename, describe, add/edit/
 * delete/import cards, toggle public/private); everyone gets a flip-through
 * study mode with markdown rendering, swap term/definition, and per-learner
 * known/still-learning progress tracking that survives content edits.
 * @param props Contains the flashcard set's id.
 * @returns The rendered page.
 */
export function FlashcardSetView({ setId }: FlashcardSetViewProps): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [forking, setForking] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [progress, setProgress] = useState<Record<string, CardStatus>>({});
  const [mode, setMode] = useState<"edit" | "study">("edit");
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [studyOrder, setStudyOrder] = useState<number[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [swapped, setSwapped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      const res = await fetch(`/api/flashcards/${setId}`);
      if (res.status === 404) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }
      const data = (await res.json()) as FlashcardSetApiResponse;
      const progressRes = await fetch(`/api/flashcards/${setId}/progress`);
      const progressData = (await progressRes.json()) as Record<string, CardStatus>;
      if (cancelled) return;
      setName(data.name);
      setDescription(data.description ?? "");
      setVisibility(data.visibility);
      setFolderId(data.folderId);
      setIsOwner(data.isOwner);
      setCards(data.cards);
      setProgress(progressData);
      setMode(data.isOwner ? "edit" : "study");
      setSwapped(window.localStorage.getItem(swapKey(setId)) === "1");
      setLoading(false);
    };
    void load();
    return (): void => {
      cancelled = true;
    };
  }, [setId]);

  const persist = useCallback(
    async (patch: Record<string, unknown>) => {
      return fetch(`/api/flashcards/${setId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    },
    [setId],
  );

  const handleSaveCards = useCallback(async () => {
    setSaving(true);
    try {
      const res = await persist({ name, description, cards });
      if (res.ok) {
        toast.success("Flashcard set saved");
      } else {
        toast.error("Couldn't save flashcard set");
      }
    } finally {
      setSaving(false);
    }
  }, [persist, name, description, cards]);

  const handleToggleVisibility = useCallback(async () => {
    const next = visibility === "public" ? "private" : "public";
    setVisibility(next);
    await persist({ visibility: next });
  }, [persist, visibility]);

  const handleChangeFolder = useCallback(
    async (nextFolderId: string | null) => {
      setFolderId(nextFolderId);
      await persist({ folderId: nextFolderId });
    },
    [persist],
  );

  const handleFork = useCallback(async () => {
    setForking(true);
    try {
      const res = await fetch(`/api/flashcards/${setId}/fork`, { method: "POST" });
      const data = (await res.json()) as { id: string };
      router.push(`/dashboard/flashcards/${data.id}`);
    } finally {
      setForking(false);
    }
  }, [setId, router]);

  const toggleSwapped = useCallback(() => {
    setSwapped((prev) => {
      const next = !prev;
      window.localStorage.setItem(swapKey(setId), next ? "1" : "0");
      return next;
    });
  }, [setId]);

  const handleImport = useCallback(() => {
    const imported = importText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [front, ...rest] = line.split("\t");
        return { id: newCard().id, front: (front ?? "").trim(), back: rest.join("\t").trim() };
      })
      .filter((c) => c.front || c.back);
    if (imported.length === 0) {
      toast.error("No tab-separated rows found");
      return;
    }
    setCards((prev) => [...prev, ...imported]);
    toast.success(`Imported ${imported.length} card${imported.length === 1 ? "" : "s"} — remember to Save`);
    setImportText("");
    setImporting(false);
  }, [importText]);

  const markCard = useCallback(
    async (cardId: string, status: CardStatus) => {
      setProgress((prev) => ({ ...prev, [cardId]: status }));
      await fetch(`/api/flashcards/${setId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, status }),
      });
    },
    [setId],
  );

  const startStudy = useCallback(
    (shuffle: boolean) => {
      const order = cards.map((_, i) => i);
      if (shuffle) {
        for (let i = order.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
      }
      setStudyOrder(order);
      setStudyIndex(0);
      setFlipped(false);
      setMode("study");
    },
    [cards],
  );

  const progressCounts = useMemo(() => {
    let known = 0;
    let learning = 0;
    for (const card of cards) {
      if (progress[card.id] === "known") known += 1;
      else if (progress[card.id] === "learning") learning += 1;
    }
    return { known, learning, untouched: cards.length - known - learning };
  }, [cards, progress]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl text-sm text-muted-foreground">
        This flashcard set doesn&apos;t exist or isn&apos;t public.
      </div>
    );
  }
  if (loading) {
    return <div className="mx-auto max-w-2xl text-sm text-muted-foreground">Loading…</div>;
  }

  if (mode === "study") {
    if (cards.length === 0) {
      return (
        <div className="mx-auto max-w-2xl text-sm text-muted-foreground">
          This set has no cards yet.
        </div>
      );
    }
    const card = cards[studyOrder[studyIndex]];
    const frontContent = swapped ? card.back : card.front;
    const backContent = swapped ? card.front : card.back;
    const status = progress[card.id];

    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-xl font-semibold">{name}</h1>
          {isOwner ? (
            <Button size="sm" variant="outline" onClick={() => setMode("edit")}>
              Edit set
            </Button>
          ) : null}
        </div>

        <p className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> {progressCounts.known} known
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <CircleDashed className="h-3.5 w-3.5" /> {progressCounts.learning} learning
          </span>
          <span>{progressCounts.untouched} new</span>
        </p>

        <div className="w-full [perspective:1200px]">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setFlipped((f) => !f);
            }}
            className={cn(
              "relative h-72 w-full cursor-pointer transition-transform duration-500 ease-out [transform-style:preserve-3d]",
              flipped && "[transform:rotateY(180deg)]",
            )}
          >
            <div className="absolute inset-0 flex items-center justify-center overflow-y-auto rounded-xl border bg-card p-6 text-center shadow-md [backface-visibility:hidden]">
              <MarkdownContent content={frontContent || "*(empty)*"} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center overflow-y-auto rounded-xl border bg-card p-6 text-center shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <MarkdownContent content={backContent || "*(empty)*"} />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Card {studyIndex + 1} of {studyOrder.length} · click the card to flip
        </p>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={status === "learning" ? "secondary" : "outline"}
            onClick={() => void markCard(card.id, "learning")}
          >
            <CircleDashed className="h-3.5 w-3.5" /> Still learning
          </Button>
          <Button
            size="sm"
            variant={status === "known" ? "secondary" : "outline"}
            onClick={() => void markCard(card.id, "known")}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Know
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={studyIndex === 0}
            onClick={() => {
              setStudyIndex((i) => Math.max(0, i - 1));
              setFlipped(false);
            }}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </Button>
          <Button size="sm" variant="outline" onClick={() => startStudy(true)}>
            <Shuffle className="h-3.5 w-3.5" /> Shuffle
          </Button>
          <Button size="sm" variant="outline" onClick={toggleSwapped}>
            Swap sides
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={studyIndex === studyOrder.length - 1}
            onClick={() => {
              setStudyIndex((i) => Math.min(studyOrder.length - 1, i + 1));
              setFlipped(false);
            }}
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isOwner ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-1 h-9 text-lg font-semibold"
            />
          ) : (
            <h1 className="mb-1 text-xl font-semibold">{name}</h1>
          )}
          {isOwner ? (
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="min-h-[50px] text-sm"
            />
          ) : description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Button size="sm" onClick={() => startStudy(false)} disabled={cards.length === 0}>
          Study
        </Button>
        {isOwner ? (
          <>
            <button
              type="button"
              onClick={() => void handleToggleVisibility()}
              className="flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {visibility === "public" ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {visibility === "public" ? "Public" : "Private"}
            </button>
            <FolderPicker value={folderId} onChange={(id) => void handleChangeFolder(id)} />
            <Button size="sm" variant="outline" onClick={() => void handleSaveCards()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => void handleFork()} disabled={forking}>
            <GitFork className="h-3.5 w-3.5" /> {forking ? "Forking…" : "Fork to edit"}
          </Button>
        )}
      </div>

      {isOwner && importing ? (
        <div className="mb-4 flex flex-col gap-2 rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">
            Paste rows of <code>front[Tab]back</code>, one card per line. Each side supports markdown.
          </p>
          <Textarea
            autoFocus
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"Pod\tSmallest deployable unit in Kubernetes\nService\tStable network endpoint for a set of Pods"}
            className="min-h-[120px] text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleImport}>
              Add imported cards
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setImporting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {cards.map((card, i) => (
          <div key={card.id} className="flex gap-2 rounded-lg border bg-card p-3">
            <span className="mt-2 text-xs text-muted-foreground">{i + 1}</span>
            <div className="flex-1">
              <Textarea
                disabled={!isOwner}
                value={card.front}
                placeholder="Front (markdown supported)"
                onChange={(e) =>
                  setCards((prev) => prev.map((c, idx) => (idx === i ? { ...c, front: e.target.value } : c)))
                }
                className="min-h-[60px] text-sm"
              />
            </div>
            <div className="flex-1">
              <Textarea
                disabled={!isOwner}
                value={card.back}
                placeholder="Back (markdown supported)"
                onChange={(e) =>
                  setCards((prev) => prev.map((c, idx) => (idx === i ? { ...c, back: e.target.value } : c)))
                }
                className="min-h-[60px] text-sm"
              />
            </div>
            {isOwner ? (
              <button
                type="button"
                onClick={() => setCards((prev) => prev.filter((_, idx) => idx !== i))}
                className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {isOwner ? (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setCards((prev) => [...prev, newCard()])}>
            <Plus className="h-3.5 w-3.5" /> Add card
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setImporting(true)}>
            <FileDown className="h-3.5 w-3.5" /> Import
          </Button>
        </div>
      ) : null}

      {isOwner && cards.length === 0 ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Trash2 className="h-3 w-3" /> No cards yet — add your first one above.
        </p>
      ) : null}
    </div>
  );
}
