"use client";

import { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import {
  COMMON_NODE_KINDS,
  NODE_COLORS,
  NODE_KIND_CATEGORIES,
  NODE_KIND_LABELS,
  NODE_KIND_SUPER_GROUPS,
  type NodeKind,
} from "@/lib/diagram-types";

const RECENT_KINDS_STORAGE_KEY = "c4-diagram:recent-node-kinds";
const MAX_RECENT_KINDS = 6;

function loadRecentKinds(): NodeKind[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KINDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k): k is NodeKind => typeof k === "string" && k in NODE_KIND_LABELS);
  } catch {
    return [];
  }
}

function saveRecentKind(kind: NodeKind): NodeKind[] {
  const next = [kind, ...loadRecentKinds().filter((k) => k !== kind)].slice(0, MAX_RECENT_KINDS);
  try {
    window.localStorage.setItem(RECENT_KINDS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode, etc.) — recents just won't persist.
  }
  return next;
}

function KindRow({
  kind,
  currentKind,
  onPick,
}: {
  kind: NodeKind;
  currentKind?: NodeKind;
  onPick: (kind: NodeKind) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent ${
        kind === currentKind ? "bg-accent font-medium" : ""
      }`}
      onClick={() => onPick(kind)}
    >
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: NODE_COLORS[kind] }}
      />
      {NODE_KIND_LABELS[kind]}
    </button>
  );
}

function PickerSectionHeader({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

/** Collapsible row: a clickable header with a chevron, its rows shown only
 * while expanded. Used uniformly for Common, Recent, and each super-group so
 * every section behaves the same way. */
function CollapsibleSection({
  label,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold hover:bg-accent"
        onClick={onToggle}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        {label}
      </button>
      {expanded ? children : null}
    </div>
  );
}

// Expanded by default: Common (the 8 most-used kinds) and the first
// super-group — keeps the pane short while still surfacing the basics.
const DEFAULT_EXPANDED = new Set(["Common", NODE_KIND_SUPER_GROUPS[0]?.label]);

/**
 * Self-contained search box (own state, own results list). Does not know
 * about — and is never affected by — the browse pane rendered next to it.
 * Mirrors draw.io's shape search: type, get a flat list of matches, click
 * one. Nothing else on the panel changes.
 */
function KindSearchBox({
  onPick,
  currentKind,
}: {
  onPick: (kind: NodeKind) => void;
  currentKind?: NodeKind;
}): React.JSX.Element {
  const [query, setQuery] = useState("");
  const lowerQuery = query.trim().toLowerCase();
  const results =
    lowerQuery.length > 0
      ? (Object.keys(NODE_KIND_LABELS) as NodeKind[]).filter((k) =>
          NODE_KIND_LABELS[k].toLowerCase().includes(lowerQuery),
        )
      : [];

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-popover">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          className="h-6 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          placeholder="Search node kinds…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {lowerQuery.length > 0 ? (
        <div className="max-h-56 overflow-y-auto border-t p-1">
          {results.length > 0 ? (
            results.map((kind) => <KindRow key={kind} kind={kind} currentKind={currentKind} onPick={onPick} />)
          ) : (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Self-contained browse pane: Common, Recent, and the 5 super-groups — every
 * section collapsible the same way. Has no notion of a search query at all;
 * it always shows the full tree, unaffected by whatever is typed in
 * {@link KindSearchBox}.
 */
function KindGroupPane({
  recentKinds,
  onPick,
  currentKind,
}: {
  recentKinds: NodeKind[];
  onPick: (kind: NodeKind) => void;
  currentKind?: NodeKind;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(DEFAULT_EXPANDED);

  const shownAlready = new Set(COMMON_NODE_KINDS);
  const recentKindsToShow = recentKinds.filter((k) => !shownAlready.has(k));
  recentKindsToShow.forEach((k) => shownAlready.add(k));

  const groups = NODE_KIND_SUPER_GROUPS.map((group) => ({
    group,
    categories: group.categories
      .map((category) => ({
        category,
        kinds: (NODE_KIND_CATEGORIES[category] ?? []).filter((k) => !shownAlready.has(k)),
      }))
      .filter(({ kinds }) => kinds.length > 0),
  })).filter(({ categories }) => categories.length > 0);

  const toggle = (label: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-popover">
      <div className="max-h-72 overflow-y-auto p-1">
        <CollapsibleSection label="Common" expanded={expanded.has("Common")} onToggle={() => toggle("Common")}>
          {COMMON_NODE_KINDS.map((kind) => (
            <KindRow key={`common-${kind}`} kind={kind} currentKind={currentKind} onPick={onPick} />
          ))}
        </CollapsibleSection>
        {recentKindsToShow.length > 0 ? (
          <CollapsibleSection label="Recent" expanded={expanded.has("Recent")} onToggle={() => toggle("Recent")}>
            {recentKindsToShow.map((kind) => (
              <KindRow key={`recent-${kind}`} kind={kind} currentKind={currentKind} onPick={onPick} />
            ))}
          </CollapsibleSection>
        ) : null}
        {groups.map(({ group, categories }) => (
          <CollapsibleSection
            key={group.label}
            label={group.label}
            expanded={expanded.has(group.label)}
            onToggle={() => toggle(group.label)}
          >
            {categories.map(({ category, kinds }) => (
              <div key={category} className="pl-3">
                <PickerSectionHeader>{category}</PickerSectionHeader>
                {kinds.map((kind) => (
                  <KindRow key={kind} kind={kind} currentKind={currentKind} onPick={onPick} />
                ))}
              </div>
            ))}
          </CollapsibleSection>
        ))}
      </div>
    </div>
  );
}

export interface InlineKindPickerProps {
  /** The currently armed/selected kind, if any — highlighted in the list. */
  currentKind?: NodeKind;
  onPick: (kind: NodeKind) => void;
  disabled?: boolean;
}

/**
 * Always-visible kind picker: no trigger button, no popup. Two genuinely
 * separate panes stacked at the same level, each with its own internal
 * state — {@link KindSearchBox} (type, get flat results) and
 * {@link KindGroupPane} (click through collapsible sections). Neither
 * reacts to the other; picking a kind in either just calls `onPick`. Used
 * both for arming a kind to place (from the toolbar) and for changing a
 * selected node's kind (from the properties panel).
 */
export function InlineKindPicker({ currentKind, onPick, disabled }: InlineKindPickerProps): React.JSX.Element {
  const [recentKinds, setRecentKinds] = useState<NodeKind[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentKinds(loadRecentKinds());
  }, []);

  const handlePick = (kind: NodeKind): void => {
    onPick(kind);
    setRecentKinds(saveRecentKind(kind));
  };

  return (
    <div className={`flex flex-col gap-2 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
      <KindSearchBox onPick={handlePick} currentKind={currentKind} />
      <KindGroupPane recentKinds={recentKinds} onPick={handlePick} currentKind={currentKind} />
    </div>
  );
}
