"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  FileDown,
  GitFork,
  Globe,
  GripVertical,
  Lock,
  Plus,
  RotateCcw,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

interface SortableCardProps {
  card: Flashcard;
  index: number;
  isOwner: boolean;
  onUpdate: (index: number, field: "front" | "back", value: string) => void;
  onDelete: (index: number) => void;
}

interface MarkdownTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MARKDOWN_SHORTCUTS: Record<string, { prefix: string; suffix: string }> = {
  b: { prefix: "**", suffix: "**" },
  i: { prefix: "*", suffix: "*" },
  u: { prefix: "<u>", suffix: "</u>" },
  e: { prefix: "`", suffix: "`" },
  k: { prefix: "[", suffix: "](url)" },
};

/**
 * A textarea that supports markdown keyboard shortcuts (Cmd/Ctrl+B for bold,
 * Cmd/Ctrl+I for italic, Cmd/Ctrl+U for underline, Cmd/Ctrl+E for inline code,
 * Cmd/Ctrl+K for link). Wraps the selection or inserts markers at the cursor.
 * @param props Standard textarea props plus a string onChange handler.
 * @returns The rendered textarea with shortcut support.
 */
function MarkdownTextarea({ value, onChange, placeholder, disabled, className }: MarkdownTextareaProps): React.JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const shortcut = MARKDOWN_SHORTCUTS[e.key.toLowerCase()];
      if (!shortcut || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();

      const textarea = ref.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.slice(start, end);
      const before = value.slice(0, start);
      const after = value.slice(end);

      const wrapped = `${shortcut.prefix}${selected || "text"}${shortcut.suffix}`;
      const newValue = `${before}${wrapped}${after}`;
      onChange(newValue);

      requestAnimationFrame(() => {
        if (selected) {
          textarea.selectionStart = start;
          textarea.selectionEnd = start + wrapped.length;
        } else {
          const cursorPos = start + shortcut.prefix.length;
          textarea.selectionStart = cursorPos;
          textarea.selectionEnd = cursorPos + 4;
        }
        textarea.focus();
      });
    },
    [value, onChange],
  );

  return (
    <Textarea
      ref={ref}
      disabled={disabled}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      className={className}
    />
  );
}

function newCard(): Flashcard {
  return { id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, front: "", back: "" };
}

function swapKey(setId: string): string {
  return `flashcards:${setId}:swapped`;
}

/**
 * A single sortable flashcard row used in the edit mode card list.
 * Supports drag-and-drop reordering via dnd-kit, inline editing of
 * front/back content, and deletion.
 * @param props The card data, index, ownership flag, and change handlers.
 * @returns The rendered sortable card row.
 */
function SortableCard({ card, index, isOwner, onUpdate, onDelete }: SortableCardProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-3 rounded-xl border-2 border-border/60 bg-card p-4 sm:flex-row",
        isDragging && "z-50 shadow-xl opacity-90 border-primary/40",
      )}
    >
      <div className="flex items-center gap-2 sm:flex-col sm:justify-start sm:gap-1">
        {isOwner ? (
          <button
            type="button"
            className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        ) : null}
        <span className="min-w-[1.5rem] text-center text-sm font-medium text-muted-foreground">{index + 1}</span>
        {isOwner ? (
          <button
            type="button"
            onClick={() => onDelete(index)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:order-last sm:mt-2"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Term
        </label>
        <MarkdownTextarea
          disabled={!isOwner}
          value={card.front}
          placeholder="Enter term"
          onChange={(val) => onUpdate(index, "front", val)}
          className="min-h-[80px] text-base"
        />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Definition
        </label>
        <MarkdownTextarea
          disabled={!isOwner}
          value={card.back}
          placeholder="Enter definition"
          onChange={(val) => onUpdate(index, "back", val)}
          className="min-h-[80px] text-base"
        />
      </div>
    </div>
  );
}

/**
 * Circular progress ring SVG used on the study results screen.
 * Draws two arcs (known in green, learning in amber) around a center label.
 * @param props The known/learning/total counts and the pixel size.
 * @returns The rendered SVG progress ring.
 */
function ProgressRing({
  known,
  learning,
  total,
  size = 180,
}: {
  known: number;
  learning: number;
  total: number;
  size?: number;
}): React.JSX.Element {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const knownPct = total > 0 ? known / total : 0;
  const learningPct = total > 0 ? learning / total : 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference * (knownPct + learningPct)} ${circumference * (1 - knownPct - learningPct)}`}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#22c55e"
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference * knownPct} ${circumference * (1 - knownPct)}`}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
      <text
        x={size / 2}
        y={size / 2 - 8}
        textAnchor="middle"
        className="fill-foreground text-3xl font-bold"
      >
        {total > 0 ? Math.round((known / total) * 100) : 0}%
      </text>
      <text
        x={size / 2}
        y={size / 2 + 16}
        textAnchor="middle"
        className="fill-muted-foreground text-sm"
      >
        mastered
      </text>
    </svg>
  );
}

/**
 * Flashcard set view: three modes — edit (create/modify cards with drag-reorder),
 * view (Quizlet-style overview with card list and study options), and study
 * (flip-through with known/learning tracking and an end-of-deck results screen).
 * Owners of new sets see "Create" / "Create & Practice" buttons; existing sets
 * show the view mode by default with an option to edit.
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
  const [mode, setMode] = useState<"edit" | "view" | "study">("edit");
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [studyOrder, setStudyOrder] = useState<number[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const [isNewSet, setIsNewSet] = useState(false);
  const [studyComplete, setStudyComplete] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
      setSwapped(window.localStorage.getItem(swapKey(setId)) === "1");

      const brandNew = data.isOwner && data.cards.length === 0;
      setIsNewSet(brandNew);
      setMode(brandNew ? "edit" : data.isOwner ? "view" : "view");
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
      setStudyComplete(false);
      setMode("study");
    },
    [cards],
  );

  const handleCreate = useCallback(async () => {
    setSaving(true);
    try {
      const res = await persist({ name, description, cards });
      if (res.ok) {
        toast.success("Flashcard set created!");
        setIsNewSet(false);
        setMode("view");
      } else {
        toast.error("Couldn't create flashcard set");
      }
    } finally {
      setSaving(false);
    }
  }, [persist, name, description, cards]);

  const handleCreateAndPractice = useCallback(async () => {
    setSaving(true);
    try {
      const res = await persist({ name, description, cards });
      if (res.ok) {
        toast.success("Flashcard set created!");
        setIsNewSet(false);
        startStudy(false);
      } else {
        toast.error("Couldn't create flashcard set");
      }
    } finally {
      setSaving(false);
    }
  }, [persist, name, description, cards, startStudy]);

  const handleSaveCards = useCallback(async () => {
    setSaving(true);
    try {
      const res = await persist({ name, description, cards });
      if (res.ok) {
        toast.success("Changes saved");
        setMode("view");
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
    toast.success(`Imported ${imported.length} card${imported.length === 1 ? "" : "s"}`);
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

  const markAndAdvance = useCallback(
    async (cardId: string, status: CardStatus) => {
      await markCard(cardId, status);
      if (studyIndex < studyOrder.length - 1) {
        setStudyIndex((i) => i + 1);
        setFlipped(false);
      } else {
        setStudyComplete(true);
      }
    },
    [markCard, studyIndex, studyOrder.length],
  );

  const resetProgress = useCallback(async () => {
    const newProgress: Record<string, CardStatus> = {};
    setProgress(newProgress);
    for (const card of cards) {
      void fetch(`/api/flashcards/${setId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, status: "learning" }),
      });
    }
    toast.success("Progress reset");
  }, [cards, setId]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCards((prev) => {
        const oldIndex = prev.findIndex((c) => c.id === active.id);
        const newIndex = prev.findIndex((c) => c.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const handleCardUpdate = useCallback((index: number, field: "front" | "back", value: string) => {
    setCards((prev) => prev.map((c, idx) => (idx === index ? { ...c, [field]: value } : c)));
  }, []);

  const handleCardDelete = useCallback((index: number) => {
    setCards((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const progressCounts = useMemo(() => {
    let known = 0;
    let learning = 0;
    for (const card of cards) {
      if (progress[card.id] === "known") known += 1;
      else if (progress[card.id] === "learning") learning += 1;
    }
    return { known, learning, untouched: cards.length - known - learning };
  }, [cards, progress]);

  useEffect(() => {
    if (mode !== "study" || studyComplete || cards.length === 0) return;
    const card = cards[studyOrder[studyIndex]];
    if (!card) return;

    const handler = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          setFlipped((f) => !f);
          break;
        case "1":
          void markAndAdvance(card.id, "learning");
          break;
        case "2":
          void markAndAdvance(card.id, "known");
          break;
        case "ArrowLeft":
          e.preventDefault();
          setStudyIndex((i) => Math.max(0, i - 1));
          setFlipped(false);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (studyIndex < studyOrder.length - 1) {
            setStudyIndex((i) => i + 1);
            setFlipped(false);
          }
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return (): void => {
      window.removeEventListener("keydown", handler);
    };
  }, [mode, studyComplete, cards, studyOrder, studyIndex, markAndAdvance]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-base text-muted-foreground">
        This flashcard set doesn&apos;t exist or isn&apos;t public.
      </div>
    );
  }
  if (loading) {
    return <div className="mx-auto max-w-3xl py-12 text-center text-base text-muted-foreground">Loading…</div>;
  }

  /* ─── Study mode ─── */
  if (mode === "study") {
    if (cards.length === 0) {
      return (
        <div className="mx-auto max-w-3xl py-12 text-center text-base text-muted-foreground">
          This set has no cards yet.
        </div>
      );
    }

    /* ─── Study complete / results screen ─── */
    if (studyComplete) {
      return (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 py-8">
          <h1 className="text-3xl font-bold">Nice work!</h1>
          <p className="text-lg text-muted-foreground">
            You&apos;ve gone through all {cards.length} cards.
          </p>

          <ProgressRing known={progressCounts.known} learning={progressCounts.learning} total={cards.length} />

          <div className="flex flex-wrap items-center justify-center gap-6 text-base">
            <span className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" /> {progressCounts.known} Know
            </span>
            <span className="flex items-center gap-2 text-amber-400">
              <CircleDashed className="h-5 w-5" /> {progressCounts.learning} Still learning
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              {progressCounts.untouched} Not started
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => startStudy(false)} className="px-6 text-base">
              <RotateCcw className="h-5 w-5" /> Study again
            </Button>
            <Button size="lg" variant="outline" onClick={() => startStudy(true)} className="px-6 text-base">
              <Shuffle className="h-5 w-5" /> Shuffle & study
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                void resetProgress();
                startStudy(false);
              }}
              className="px-6 text-base"
            >
              <RotateCcw className="h-5 w-5" /> Reset progress & restart
            </Button>
          </div>

          <Button size="lg" variant="ghost" onClick={() => setMode("view")} className="text-base">
            Back to set
          </Button>
        </div>
      );
    }

    /* ─── Study card view ─── */
    const card = cards[studyOrder[studyIndex]];
    const frontContent = swapped ? card.back : card.front;
    const backContent = swapped ? card.front : card.back;
    const status = progress[card.id];

    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-4">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-2xl font-bold">{name}</h1>
          <Button size="default" variant="ghost" onClick={() => setMode("view")} className="text-base">
            Back to set
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> {progressCounts.known} known
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <CircleDashed className="h-4 w-4" /> {progressCounts.learning} learning
          </span>
          <span className="text-muted-foreground">{progressCounts.untouched} new</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${((studyIndex + 1) / studyOrder.length) * 100}%` }}
          />
        </div>

        <div className="w-full [perspective:1200px]">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setFlipped((f) => !f);
            }}
            className={cn(
              "relative h-80 w-full cursor-pointer transition-transform duration-500 ease-out [transform-style:preserve-3d]",
              flipped && "[transform:rotateY(180deg)]",
            )}
          >
            <div className="absolute inset-0 flex items-center justify-center overflow-y-auto rounded-2xl border-2 border-border/60 bg-card p-8 text-center shadow-lg [backface-visibility:hidden]">
              <div className="text-lg">
                <MarkdownContent content={frontContent || "*(empty)*"} />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center overflow-y-auto rounded-2xl border-2 border-primary/30 bg-card p-8 text-center shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="text-lg">
                <MarkdownContent content={backContent || "*(empty)*"} />
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Card {studyIndex + 1} of {studyOrder.length} · space to flip · 1 still learning · 2 know · ←→ navigate
        </p>

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            variant={status === "learning" ? "secondary" : "outline"}
            onClick={() => void markAndAdvance(card.id, "learning")}
            className="px-6 text-base"
          >
            <CircleDashed className="h-5 w-5" /> Still learning
          </Button>
          <Button
            size="lg"
            variant={status === "known" ? "secondary" : "outline"}
            onClick={() => void markAndAdvance(card.id, "known")}
            className="px-6 text-base"
          >
            <CheckCircle2 className="h-5 w-5" /> Know
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="default"
            variant="outline"
            disabled={studyIndex === 0}
            onClick={() => {
              setStudyIndex((i) => Math.max(0, i - 1));
              setFlipped(false);
            }}
            className="text-base"
          >
            <ChevronLeft className="h-5 w-5" /> Prev
          </Button>
          <Button size="default" variant="outline" onClick={() => startStudy(true)} className="text-base">
            <Shuffle className="h-5 w-5" /> Shuffle
          </Button>
          <Button size="default" variant="outline" onClick={toggleSwapped} className="text-base">
            Swap sides
          </Button>
          <Button
            size="default"
            variant="outline"
            disabled={studyIndex === studyOrder.length - 1}
            onClick={() => {
              setStudyIndex((i) => Math.min(studyOrder.length - 1, i + 1));
              setFlipped(false);
            }}
            className="text-base"
          >
            Next <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  /* ─── View mode (Quizlet-style overview) ─── */
  if (mode === "view") {
    return (
      <div className="mx-auto max-w-3xl py-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{name}</h1>
          {description ? <p className="mt-1 text-base text-muted-foreground">{description}</p> : null}
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              {visibility === "public" ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {visibility === "public" ? "Public" : "Private"}
            </span>
            <span>{cards.length} card{cards.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={() => startStudy(false)}
            disabled={cards.length === 0}
            className="bg-primary px-8 text-base font-semibold"
          >
            Study Flashcards
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => startStudy(true)}
            disabled={cards.length === 0}
            className="px-6 text-base"
          >
            <Shuffle className="h-5 w-5" /> Shuffle
          </Button>
          {isOwner ? (
            <Button
              size="lg"
              variant="outline"
              onClick={() => setMode("edit")}
              className="px-6 text-base"
            >
              Edit set
            </Button>
          ) : (
            <Button
              size="lg"
              variant="outline"
              onClick={() => void handleFork()}
              disabled={forking}
              className="px-6 text-base"
            >
              <GitFork className="h-5 w-5" /> {forking ? "Forking…" : "Fork to edit"}
            </Button>
          )}
        </div>

        {/* Progress overview */}
        {cards.length > 0 ? (
          <div className="mb-8 flex items-center gap-6 rounded-xl border-2 border-border/60 bg-card p-5">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {progressCounts.known} know
              </span>
              <span className="flex items-center gap-1.5 font-medium text-amber-400">
                <CircleDashed className="h-4 w-4" /> {progressCounts.learning} learning
              </span>
              <span className="text-muted-foreground">{progressCounts.untouched} not started</span>
            </div>
            {progressCounts.known > 0 || progressCounts.learning > 0 ? (
              <Button
                size="default"
                variant="ghost"
                onClick={() => void resetProgress()}
                className="ml-auto text-sm"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Card list preview */}
        <h2 className="mb-3 text-lg font-semibold">
          Terms in this set ({cards.length})
        </h2>
        {cards.length === 0 ? (
          <p className="text-base text-muted-foreground">No cards yet — edit the set to add some.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {cards.map((card, i) => (
              <div
                key={card.id}
                className="flex items-stretch gap-0 overflow-hidden rounded-xl border-2 border-border/60 bg-card"
              >
                <div className="flex w-10 shrink-0 items-center justify-center border-r border-border/40 bg-muted/30 text-sm font-medium text-muted-foreground">
                  {i + 1}
                </div>
                <div className="flex flex-1 items-center border-r border-border/40 p-4">
                  <p className="text-base">{card.front || <span className="italic text-muted-foreground">empty</span>}</p>
                </div>
                <div className="flex flex-1 items-center p-4">
                  <p className="text-base">{card.back || <span className="italic text-muted-foreground">empty</span>}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ─── Edit mode ─── */
  return (
    <div className="mx-auto max-w-3xl py-4">
      <div className="mb-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {isNewSet ? "Create a new flashcard set" : "Edit flashcard set"}
          </h2>
          {!isNewSet ? (
            <Button size="default" variant="ghost" onClick={() => setMode("view")} className="text-base">
              Cancel
            </Button>
          ) : null}
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a title"
          className="mb-3 h-12 text-xl font-bold"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description (optional)"
          className="min-h-[60px] text-base"
        />
      </div>

      {isOwner ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleToggleVisibility()}
            className="flex items-center gap-1.5 rounded-lg border-2 border-border/60 px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {visibility === "public" ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {visibility === "public" ? "Public" : "Private"}
          </button>
          <FolderPicker value={folderId} onChange={(id) => void handleChangeFolder(id)} />
        </div>
      ) : null}

      {isOwner && importing ? (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border-2 border-primary/20 bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Paste rows of <code className="rounded bg-muted px-1 py-0.5">front[Tab]back</code>, one card per line. Markdown supported.
          </p>
          <Textarea
            autoFocus
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"Pod\tSmallest deployable unit in Kubernetes\nService\tStable network endpoint for a set of Pods"}
            className="min-h-[140px] text-base"
          />
          <div className="flex gap-3">
            <Button size="lg" onClick={handleImport} className="text-base">
              Add imported cards
            </Button>
            <Button size="lg" variant="ghost" onClick={() => setImporting(false)} className="text-base">
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {/* Sortable card list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-4">
            {cards.map((card, i) => (
              <SortableCard
                key={card.id}
                card={card}
                index={i}
                isOwner={isOwner}
                onUpdate={handleCardUpdate}
                onDelete={handleCardDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isOwner ? (
        <div className="mt-5 flex gap-3">
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setCards((prev) => [...prev, newCard()])}
            className="text-base"
          >
            <Plus className="h-5 w-5" /> Add card
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setImporting(true)} className="text-base">
            <FileDown className="h-5 w-5" /> Import
          </Button>
        </div>
      ) : null}

      {isOwner && cards.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-base text-muted-foreground">
          <Trash2 className="h-4 w-4" /> No cards yet — add your first one above.
        </p>
      ) : null}

      {/* Bottom action bar */}
      {isOwner ? (
        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-border/40 pt-6">
          {isNewSet ? (
            <>
              <Button
                size="lg"
                variant="outline"
                onClick={() => void handleCreate()}
                disabled={saving || cards.length === 0}
                className="px-8 text-base"
              >
                Create
              </Button>
              <Button
                size="lg"
                onClick={() => void handleCreateAndPractice()}
                disabled={saving || cards.length === 0}
                className="px-8 text-base font-semibold"
              >
                Create & Practice
              </Button>
            </>
          ) : (
            <>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => setMode("view")}
                className="text-base"
              >
                Cancel
              </Button>
              <Button
                size="lg"
                onClick={() => void handleSaveCards()}
                disabled={saving}
                className="px-8 text-base font-semibold"
              >
                Done
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
