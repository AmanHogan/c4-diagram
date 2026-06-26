"use client";

import { Trash2, Group, Ungroup, Plus } from "lucide-react";
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

interface PropertiesPanelProps {
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

  return (
    <div
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col gap-4 overflow-y-auto border-l bg-card/95 p-4"
    >
      <div
        onPointerDown={onPointerDown}
        className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40"
      />
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

      {selectedNodeIds.length >= 2 ? (
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
              value={selectedNode.label}
              onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            Kind
            <Select
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

          <label className="flex flex-col gap-1 text-xs">
            Fill color
            <input
              type="color"
              className="h-8 w-full cursor-pointer rounded-md border border-input bg-transparent"
              value={selectedNode.fillColor ?? NODE_COLORS[selectedNode.kind]}
              onChange={(e) => onUpdateNode(selectedNode.id, { fillColor: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            Description
            <Textarea
              className="min-h-[60px]"
              value={selectedNode.description ?? ""}
              onChange={(e) => onUpdateNode(selectedNode.id, { description: e.target.value })}
            />
          </label>

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
              value={selectedEdge.label ?? ""}
              onChange={(e) => onUpdateEdge(selectedEdge.id, { label: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            Kind
            <Select
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

          <Button size="sm" variant="destructive" onClick={() => onDeleteEdge(selectedEdge.id)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
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
