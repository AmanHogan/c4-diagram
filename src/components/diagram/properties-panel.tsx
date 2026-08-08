"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Group, Ungroup, Plus, PanelRightClose, PanelRightOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EDGE_KIND_LABELS,
  EDGE_STYLES,
  HANDLE_SIDE_LABELS,
  NODE_COLORS,
  NODE_KIND_CATEGORIES,
  NODE_KIND_LABELS,
  TEXT_SIZE_LABELS,
  type ArrowStyle,
  type DiagramEdgeData,
  type DiagramNodeData,
  type EdgeKind,
  type HandleSide,
  type LineStyle,
  type NodeKind,
  type NodeShape,
  type TextSize,
} from "@/lib/diagram-types";
import { useResizableWidth } from "@/lib/use-resizable-width";
import type { DiagramTool } from "@/components/diagram/diagram-toolbar";

const TEXT_SIZES = Object.keys(TEXT_SIZE_LABELS) as TextSize[];

const EDGE_KINDS = Object.keys(EDGE_KIND_LABELS) as EdgeKind[];
const HANDLE_SIDES = Object.keys(HANDLE_SIDE_LABELS) as HandleSide[];
const SHAPES: { value: NodeShape; label: string }[] = [
  { value: "rectangle", label: "Rectangle" },
  { value: "rounded", label: "Rounded" },
  { value: "diamond", label: "Diamond" },
  { value: "ellipse", label: "Ellipse" },
];
const LINE_STYLES: { value: LineStyle; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
];
const ARROW_STYLES: { value: ArrowStyle; label: string }[] = [
  { value: "forward", label: "One-way →" },
  { value: "both", label: "Bidirectional ↔" },
  { value: "none", label: "No arrowheads —" },
];

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

interface FillColorPickerProps {
  value: string;
  onCommit: (color: string) => void;
}

/**
 * Native color input that only commits (triggering the expensive diagram
 * rebuild) on the picker's `change` event — i.e. once, when the user closes
 * it — instead of on every drag movement inside the picker. React's onChange
 * fires continuously on the underlying `input` event, which was triggering a
 * full rebuild per pixel of drag and could stall/close the native picker.
 * @param props The current color and a commit callback.
 * @returns The rendered color input.
 */
function FillColorPicker({ value, onCommit }: FillColorPickerProps): React.JSX.Element {
  const ref = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState(value);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleChange = (e: Event): void => {
      onCommit((e.target as HTMLInputElement).value);
    };
    el.addEventListener("change", handleChange);
    return (): void => el.removeEventListener("change", handleChange);
  }, [onCommit]);

  return (
    <input
      ref={ref}
      type="color"
      className="h-8 w-full cursor-pointer rounded-md border border-input bg-transparent"
      value={local}
      onInput={(e) => setLocal(e.currentTarget.value)}
    />
  );
}

/** Shared dropdown body: a search box plus a scrollable, categorized (and
 * optionally "Recent") list of node kinds. Used by both the "Add node"
 * picker and the "change kind" selector below. */
function KindPickerList({
  query,
  onQueryChange,
  recentKinds,
  onPick,
  currentKind,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  recentKinds: NodeKind[];
  onPick: (kind: NodeKind) => void;
  currentKind?: NodeKind;
}): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const lowerQuery = query.trim().toLowerCase();
  const matches = (kind: NodeKind): boolean =>
    lowerQuery.length === 0 || NODE_KIND_LABELS[kind].toLowerCase().includes(lowerQuery);
  const recentMatches = lowerQuery.length === 0 ? recentKinds : recentKinds.filter(matches);

  let anyMatch = recentMatches.length > 0;

  return (
    <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-72 overflow-hidden rounded-lg border bg-popover shadow-lg">
      <div className="flex items-center gap-2 border-b px-2 py-1.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          className="h-6 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          placeholder="Search node kinds…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <div className="max-h-72 overflow-y-auto p-1">
        {recentMatches.length > 0 ? (
          <div>
            <p className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent
            </p>
            {recentMatches.map((kind) => (
              <button
                key={`recent-${kind}`}
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
            ))}
          </div>
        ) : null}
        {Object.entries(NODE_KIND_CATEGORIES).map(([category, kinds]) => {
          const filtered = kinds.filter(matches);
          if (filtered.length === 0) return null;
          anyMatch = true;
          return (
            <div key={category}>
              <p className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {category}
              </p>
              {filtered.map((kind) => (
                <button
                  key={kind}
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
              ))}
            </div>
          );
        })}
        {!anyMatch ? <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p> : null}
      </div>
    </div>
  );
}

interface SearchableKindPickerProps {
  onSelect: (kind: NodeKind) => void;
  /** The currently-armed kind (shown in the trigger instead of the generic
   * "Add node…" placeholder), if any. */
  armedKind?: NodeKind | null;
}

/** Searchable dropdown for arming a node kind to place, grouped by category
 * with a "Recent" section (persisted to localStorage) up top. */
function SearchableKindPicker({ onSelect, armedKind }: SearchableKindPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentKinds, setRecentKinds] = useState<NodeKind[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return (): void => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="flex h-8 w-full items-center gap-1.5 rounded-md border border-input bg-transparent px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        onClick={() => {
          if (!open) setRecentKinds(loadRecentKinds());
          setOpen(!open);
        }}
      >
        {armedKind ? (
          <>
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: NODE_COLORS[armedKind] }}
            />
            <span className="text-foreground">{NODE_KIND_LABELS[armedKind]}</span>
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" />
            <span>Choose a kind…</span>
          </>
        )}
      </button>
      {open ? (
        <KindPickerList
          query={query}
          onQueryChange={setQuery}
          recentKinds={recentKinds}
          currentKind={armedKind ?? undefined}
          onPick={(kind) => {
            onSelect(kind);
            saveRecentKind(kind);
            setOpen(false);
            setQuery("");
          }}
        />
      ) : null}
    </div>
  );
}

interface SearchableKindSelectProps {
  value: NodeKind;
  onChange: (kind: NodeKind) => void;
  disabled?: boolean;
}

/** Searchable dropdown for changing a selected node's kind. */
function SearchableKindSelect({ value, onChange, disabled }: SearchableKindSelectProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentKinds, setRecentKinds] = useState<NodeKind[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return (): void => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        className="flex h-8 w-full items-center gap-1.5 rounded-md border border-input bg-transparent px-2 text-xs disabled:opacity-50"
        onClick={() => {
          if (disabled) return;
          if (!open) setRecentKinds(loadRecentKinds());
          setOpen(!open);
        }}
      >
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS[value] }} />
        {NODE_KIND_LABELS[value]}
      </button>
      {open ? (
        <KindPickerList
          query={query}
          onQueryChange={setQuery}
          recentKinds={recentKinds}
          currentKind={value}
          onPick={(kind) => {
            onChange(kind);
            saveRecentKind(kind);
            setOpen(false);
            setQuery("");
          }}
        />
      ) : null}
    </div>
  );
}

interface PropertiesPanelProps {
  readOnly?: boolean;
  selectedNode: DiagramNodeData | null;
  selectedEdge: DiagramEdgeData | null;
  selectedNodeIds: string[];
  onUpdateNode: (id: string, patch: Partial<DiagramNodeData>) => void;
  onUpdateEdge: (id: string, patch: Partial<DiagramEdgeData>) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onGroup: (ids: string[]) => void;
  onUngroup: (id: string) => void;
  /** The currently active canvas tool — the "Add node" section only shows
   * while this is "node", mirroring a tool-first editor like Excalidraw. */
  tool: DiagramTool;
  /** The kind armed for placement while the Node tool is active. */
  pendingNodeKind: NodeKind | null;
  onArmNodeKind: (kind: NodeKind) => void;
}

/**
 * Side panel for editing the selected node or edge's style and metadata, plus
 * grouping multi-selected nodes and arming a node kind to place (only while
 * the Node tool is active — pick the tool up top, then click the canvas).
 * @param props Selection state and mutation callbacks from the canvas.
 * @returns The rendered panel.
 */
export function PropertiesPanel({
  readOnly = false,
  selectedNode,
  selectedEdge,
  selectedNodeIds,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
  onGroup,
  onUngroup,
  tool,
  pendingNodeKind,
  onArmNodeKind,
}: PropertiesPanelProps): React.JSX.Element {
  const { width, onPointerDown } = useResizableWidth(288, 240, 480, "left");
  const [collapsed, setCollapsed] = useState(false);

  // Start collapsed on narrow (mobile) viewports to maximize canvas room.
  useEffect(() => {
    if (window.innerWidth < 768) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true);
    }
  }, []);

  if (collapsed) {
    return (
      <div className="flex h-full w-12 shrink-0 flex-col items-center border-l bg-sidebar py-3">
        <button
          type="button"
          title="Expand panel"
          onClick={() => setCollapsed(false)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col gap-4 overflow-y-auto border-l bg-sidebar p-4"
    >
      <div
        onPointerDown={onPointerDown}
        className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Properties
        </p>
        <button
          type="button"
          title="Collapse panel"
          onClick={() => setCollapsed(true)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>
      {readOnly ? (
        <p className="rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground">
          View only — fork this diagram to edit it.
        </p>
      ) : tool === "node" ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Add node
          </p>
          <SearchableKindPicker onSelect={onArmNodeKind} armedKind={pendingNodeKind} />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {pendingNodeKind
              ? "Click anywhere on the canvas to place it."
              : "Pick a kind, then click the canvas to place it."}
          </p>
        </div>
      ) : tool === "text" ? (
        <p className="rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground">
          Click anywhere on the canvas to add text.
        </p>
      ) : (
        <p className="rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground">
          Select the Node tool above to add a node.
        </p>
      )}

      {!readOnly && selectedNodeIds.length >= 2 ? (
        <Button size="sm" variant="secondary" onClick={() => onGroup(selectedNodeIds)}>
          <Group className="h-3.5 w-3.5" /> Group {selectedNodeIds.length} nodes
        </Button>
      ) : null}

      {selectedNode ? (
        <div className="flex flex-col gap-3 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Node
          </p>

          <label className="flex flex-col gap-1 text-xs">
            Label
            <Input
              disabled={readOnly}
              value={selectedNode.label}
              onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })}
            />
          </label>

          <div className="flex flex-col gap-1 text-xs">
            Kind
            <SearchableKindSelect
              disabled={readOnly}
              value={selectedNode.kind}
              onChange={(kind) => onUpdateNode(selectedNode.id, { kind })}
            />
          </div>

          {selectedNode.kind !== "text" ? (
            <>
              <label className="flex flex-col gap-1 text-xs">
                Shape
                <Select
                  disabled={readOnly}
                  value={selectedNode.shape ?? "rounded"}
                  onValueChange={(value) => onUpdateNode(selectedNode.id, { shape: value as NodeShape })}
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHAPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="flex flex-col gap-1 text-xs">
                Border style
                <Select
                  disabled={readOnly}
                  value={selectedNode.borderStyle ?? "solid"}
                  onValueChange={(value) =>
                    onUpdateNode(selectedNode.id, { borderStyle: value as LineStyle })
                  }
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINE_STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <div className="flex flex-col gap-1 text-xs">
                Fill
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedNode.filled === false ? "outline" : "secondary"}
                    disabled={readOnly}
                    className="flex-1"
                    onClick={() => onUpdateNode(selectedNode.id, { filled: true })}
                  >
                    Filled
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedNode.filled === false ? "secondary" : "outline"}
                    disabled={readOnly}
                    className="flex-1"
                    onClick={() => onUpdateNode(selectedNode.id, { filled: false })}
                  >
                    Outline
                  </Button>
                </div>
              </div>

              {!readOnly ? (
                <label className="flex flex-col gap-1 text-xs">
                  {selectedNode.filled === false ? "Outline color" : "Fill color"}
                  <FillColorPicker
                    value={selectedNode.fillColor ?? NODE_COLORS[selectedNode.kind]}
                    onCommit={(color) => onUpdateNode(selectedNode.id, { fillColor: color })}
                  />
                </label>
              ) : null}

              <label className="flex flex-col gap-1 text-xs">
                Description
                <Textarea
                  disabled={readOnly}
                  className="min-h-[60px]"
                  value={selectedNode.description ?? ""}
                  onChange={(e) => onUpdateNode(selectedNode.id, { description: e.target.value })}
                />
              </label>
            </>
          ) : (
            <>
              {!readOnly ? (
                <label className="flex flex-col gap-1 text-xs">
                  Text color
                  <FillColorPicker
                    value={selectedNode.fillColor ?? NODE_COLORS[selectedNode.kind]}
                    onCommit={(color) => onUpdateNode(selectedNode.id, { fillColor: color })}
                  />
                </label>
              ) : null}

              <label className="flex flex-col gap-1 text-xs">
                Size
                <Select
                  disabled={readOnly}
                  value={selectedNode.fontSize ?? "md"}
                  onValueChange={(value) => onUpdateNode(selectedNode.id, { fontSize: value as TextSize })}
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEXT_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {TEXT_SIZE_LABELS[size]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <p className="text-[11px] text-muted-foreground">
                Double-click the text on the canvas to edit it — or resize it like a node by
                dragging its corner handles.
              </p>
            </>
          )}

          {!readOnly ? (
            <div className="flex gap-2">
              {selectedNode.kind === "group" ? (
                <Button size="sm" variant="secondary" onClick={() => onUngroup(selectedNode.id)}>
                  <Ungroup className="h-3.5 w-3.5" /> Ungroup
                </Button>
              ) : null}
              <Button size="sm" variant="destructive" onClick={() => onDeleteNode(selectedNode.id)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedEdge ? (
        <div className="flex flex-col gap-3 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Connection
          </p>

          <label className="flex flex-col gap-1 text-xs">
            Label
            <Input
              disabled={readOnly}
              value={selectedEdge.label ?? ""}
              onChange={(e) => onUpdateEdge(selectedEdge.id, { label: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            Kind
            <Select
              disabled={readOnly}
              value={selectedEdge.kind}
              onValueChange={(value) => onUpdateEdge(selectedEdge.id, { kind: value as EdgeKind })}
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDGE_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {EDGE_KIND_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs">
              Source side
              <Select
                disabled={readOnly}
                value={selectedEdge.sourceHandle ?? "auto"}
                onValueChange={(value) =>
                  onUpdateEdge(selectedEdge.id, {
                    sourceHandle: value === "auto" ? undefined : (value as HandleSide),
                  })
                }
              >
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  {HANDLE_SIDES.map((side) => (
                    <SelectItem key={side} value={side}>
                      {HANDLE_SIDE_LABELS[side]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs">
              Target side
              <Select
                disabled={readOnly}
                value={selectedEdge.targetHandle ?? "auto"}
                onValueChange={(value) =>
                  onUpdateEdge(selectedEdge.id, {
                    targetHandle: value === "auto" ? undefined : (value as HandleSide),
                  })
                }
              >
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  {HANDLE_SIDES.map((side) => (
                    <SelectItem key={side} value={side}>
                      {HANDLE_SIDE_LABELS[side]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs">
            Arrow style
            <Select
              disabled={readOnly}
              value={selectedEdge.arrowStyle ?? "forward"}
              onValueChange={(value) =>
                onUpdateEdge(selectedEdge.id, { arrowStyle: value as ArrowStyle })
              }
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARROW_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1 text-xs">
            Line style
            <Select
              disabled={readOnly}
              value={selectedEdge.lineStyle ?? EDGE_STYLES[selectedEdge.kind].lineStyle}
              onValueChange={(value) =>
                onUpdateEdge(selectedEdge.id, { lineStyle: value as LineStyle })
              }
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINE_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          {!readOnly ? (
            <Button size="sm" variant="destructive" onClick={() => onDeleteEdge(selectedEdge.id)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          ) : null}
        </div>
      ) : null}

      {!selectedNode && !selectedEdge ? (
        <p className="text-xs text-muted-foreground">
          Select a node or connection to edit its style. Shift-click to multi-select nodes for
          grouping. Double-click a node to drill into it — even an empty one, so you can add its
          first child. Drag an edge&apos;s endpoint to reconnect it.
        </p>
      ) : null}
    </div>
  );
}
