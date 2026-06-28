"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Group, Ungroup, Plus, PanelRightClose, PanelRightOpen } from "lucide-react";
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
  NODE_COLORS,
  NODE_KIND_LABELS,
  type ArrowStyle,
  type DiagramEdgeData,
  type DiagramNodeData,
  type EdgeKind,
  type LineStyle,
  type NodeKind,
  type NodeShape,
} from "@/lib/diagram-types";
import { useResizableWidth } from "@/lib/use-resizable-width";

const NODE_KINDS = Object.keys(NODE_KIND_LABELS) as NodeKind[];
const EDGE_KINDS = Object.keys(EDGE_KIND_LABELS) as EdgeKind[];
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
  onAddNode: (kind: NodeKind) => void;
}

/**
 * Side panel for editing the selected node or edge's style and metadata, plus
 * grouping multi-selected nodes and adding new nodes to the current scope.
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
  onAddNode,
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
      ) : (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Add node
          </p>
          <Select onValueChange={(value) => onAddNode(value as NodeKind)}>
            <SelectTrigger size="sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Plus className="h-3.5 w-3.5" /> <SelectValue placeholder="Choose a kind…" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {NODE_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {NODE_KIND_LABELS[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

          <label className="flex flex-col gap-1 text-xs">
            Kind
            <Select
              disabled={readOnly}
              value={selectedNode.kind}
              onValueChange={(value) => onUpdateNode(selectedNode.id, { kind: value as NodeKind })}
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NODE_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {NODE_KIND_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

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

          {!readOnly ? (
            <label className="flex flex-col gap-1 text-xs">
              Fill color
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
          grouping.
        </p>
      ) : null}
    </div>
  );
}
