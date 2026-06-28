"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  ConnectionMode,
  useReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { ChevronRight, Download, GitFork, Home, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompositeNode, type CompositeNodeData } from "@/components/diagram/composite-node";
import { PropertiesPanel } from "@/components/diagram/properties-panel";
import { FolderPicker } from "@/components/library/folder-picker";
import {
  EDGE_STYLES,
  NODE_COLORS,
  type DiagramDocument,
  type DiagramEdgeData,
  type DiagramNodeData,
  type NodeKind,
} from "@/lib/diagram-types";

const NODE_TYPES = { composite: CompositeNode };

const DEFAULT_COLLAPSED_SIZE = { width: 260, height: 110 };
const GROUP_PADDING = 48;
const CHILD_GRID_GAP = 24;
const CHILD_GRID_SIDE_INSET = 24;
const CHILD_GRID_TOP_INSET = 64;

interface DiagramApiResponse extends DiagramDocument {
  id: string;
  name: string;
  visibility: "public" | "private";
  folderId: string | null;
  isOwner: boolean;
  ownerName: string;
}

/**
 * Arrange a node's direct children in a non-overlapping grid, inset from the
 * parent's edges (extra inset at the top to clear the parent's own header).
 * Returns the child positions plus the minimum parent size needed to fit them
 * without their cards touching the parent's border.
 */
function layoutChildrenGrid(
  children: DiagramNodeData[],
  availableWidth: number,
): { positions: Map<string, { x: number; y: number }>; requiredSize: { width: number; height: number } } {
  const cols = Math.max(
    1,
    Math.floor((availableWidth - CHILD_GRID_SIDE_INSET * 2 + CHILD_GRID_GAP) / (DEFAULT_COLLAPSED_SIZE.width + CHILD_GRID_GAP)),
  );
  const positions = new Map<string, { x: number; y: number }>();
  children.forEach((child, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.set(child.id, {
      x: CHILD_GRID_SIDE_INSET + col * (DEFAULT_COLLAPSED_SIZE.width + CHILD_GRID_GAP),
      y: CHILD_GRID_TOP_INSET + row * (DEFAULT_COLLAPSED_SIZE.height + CHILD_GRID_GAP),
    });
  });
  const rows = Math.ceil(children.length / cols);
  const width = CHILD_GRID_SIDE_INSET * 2 + cols * DEFAULT_COLLAPSED_SIZE.width + (cols - 1) * CHILD_GRID_GAP;
  const height =
    CHILD_GRID_TOP_INSET + rows * DEFAULT_COLLAPSED_SIZE.height + (rows - 1) * CHILD_GRID_GAP + CHILD_GRID_SIDE_INSET;
  return { positions, requiredSize: { width, height } };
}

/** Lay out `id`'s children in a grid and grow `id` to fit them, returning the updated node list. */
function expandWithLayout(nodes: DiagramNodeData[], id: string): DiagramNodeData[] {
  const target = nodes.find((n) => n.id === id);
  if (!target) return nodes;
  const children = nodes.filter((n) => n.parentId === id);
  if (children.length === 0) return nodes;
  const baseWidth = target.size?.width ?? DEFAULT_COLLAPSED_SIZE.width;
  const { positions, requiredSize } = layoutChildrenGrid(children, baseWidth);
  const newSize = {
    width: Math.max(baseWidth, requiredSize.width),
    height: Math.max(target.size?.height ?? DEFAULT_COLLAPSED_SIZE.height, requiredSize.height),
  };
  return nodes.map((n) => {
    if (n.id === id) return { ...n, size: newSize };
    const pos = positions.get(n.id);
    return pos ? { ...n, position: pos } : n;
  });
}

const DASH_PATTERN: Record<string, string | undefined> = {
  solid: undefined,
  dashed: "8 6",
  dotted: "2 4",
};

function diagramNodeToFlowNode(
  node: DiagramNodeData,
  hasChildren: boolean,
  scopeId: string | null,
  readOnly: boolean,
  onToggleExpand: (id: string) => void,
  onDrillIn: (id: string) => void,
): Node<CompositeNodeData> {
  const size = node.expanded ? node.size ?? DEFAULT_COLLAPSED_SIZE : node.collapsedSize ?? DEFAULT_COLLAPSED_SIZE;
  const flowParentId = node.parentId === scopeId ? undefined : node.parentId ?? undefined;
  return {
    id: node.id,
    type: "composite",
    position: node.position,
    parentId: flowParentId,
    extent: flowParentId ? "parent" : undefined,
    draggable: !readOnly,
    style: { width: size.width, height: size.height },
    data: {
      label: node.label,
      kind: node.kind,
      description: node.description,
      shape: node.shape ?? "rounded",
      fillColor: node.fillColor ?? NODE_COLORS[node.kind],
      borderStyle: node.borderStyle ?? "solid",
      hasChildren,
      expanded: node.expanded,
      readOnly,
      onToggleExpand,
      onDrillIn,
    },
  };
}

/** Nodes whose parent is `scopeId`, then each expanded node's children, parent-before-child. */
function visibleDiagramNodes(all: DiagramNodeData[], scopeId: string | null): DiagramNodeData[] {
  const byParent = new Map<string | null, DiagramNodeData[]>();
  for (const n of all) {
    const siblings = byParent.get(n.parentId) ?? [];
    siblings.push(n);
    byParent.set(n.parentId, siblings);
  }

  const result: DiagramNodeData[] = [];
  function walk(parentId: string | null): void {
    for (const n of byParent.get(parentId) ?? []) {
      result.push(n);
      if (n.expanded) {
        walk(n.id);
      }
    }
  }
  walk(scopeId);
  return result;
}

function descendantIds(all: DiagramNodeData[], rootId: string): string[] {
  const ids: string[] = [];
  function walk(parentId: string): void {
    for (const n of all) {
      if (n.parentId === parentId) {
        ids.push(n.id);
        walk(n.id);
      }
    }
  }
  walk(rootId);
  return ids;
}

function diagramEdgeToFlowEdge(edge: DiagramEdgeData): Edge {
  const defaults = EDGE_STYLES[edge.kind];
  const lineStyle = edge.lineStyle ?? defaults.lineStyle;
  const arrowStyle = edge.arrowStyle ?? "forward";
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "smoothstep",
    style: { stroke: defaults.stroke, strokeDasharray: DASH_PATTERN[lineStyle], strokeWidth: 1.75 },
    labelStyle: { fontSize: 10, fill: "var(--muted-foreground)" },
    labelBgStyle: { fill: "var(--card)" },
    markerEnd:
      arrowStyle === "none" ? undefined : { type: MarkerType.ArrowClosed, color: defaults.stroke },
    markerStart:
      arrowStyle === "both" ? { type: MarkerType.ArrowClosed, color: defaults.stroke } : undefined,
  };
}

interface DiagramCanvasInnerProps {
  diagramId: string;
}

/**
 * Client-side diagram canvas: loads the diagram by id, renders it as an
 * expandable/connectable/drillable React Flow graph with a style-editing
 * side panel, and persists changes on save. Read-only (with a fork action)
 * when the viewer isn't the owner.
 * @param props Contains the diagram's id.
 * @returns The rendered canvas.
 */
function DiagramCanvasInner({ diagramId }: DiagramCanvasInnerProps): React.JSX.Element {
  const router = useRouter();
  const diagramRef = useRef<DiagramDocument>({ nodes: [], edges: [] });
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CompositeNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [diagramName, setDiagramName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [forking, setForking] = useState(false);
  const [scopeStack, setScopeStack] = useState<{ id: string; label: string }[]>([]);
  const [selectedNode, setSelectedNode] = useState<DiagramNodeData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<DiagramEdgeData | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  const readOnly = !isOwner;
  const readOnlyRef = useRef(readOnly);
  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);

  const scopeId = scopeStack.at(-1)?.id ?? null;
  const scopeIdRef = useRef<string | null>(null);
  useEffect(() => {
    scopeIdRef.current = scopeId;
  }, [scopeId]);

  const rebuildFlow = useCallback(
    (
      doc: DiagramDocument,
      currentScopeId: string | null,
      onToggleExpand: (id: string) => void,
      onDrillIn: (id: string) => void,
    ) => {
      const visible = visibleDiagramNodes(doc.nodes, currentScopeId);
      const visibleIds = new Set(visible.map((n) => n.id));
      setNodes(
        visible.map((n) =>
          diagramNodeToFlowNode(
            n,
            doc.nodes.some((c) => c.parentId === n.id),
            currentScopeId,
            readOnlyRef.current,
            onToggleExpand,
            onDrillIn,
          ),
        ),
      );
      setEdges(
        doc.edges
          .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
          .map(diagramEdgeToFlowEdge),
      );
    },
    [setNodes, setEdges],
  );

  // onToggleExpand / onDrillIn must be stable (handed to every node's data)
  // but need to call rebuildFlow with themselves — route through refs to
  // break the circular dependency instead of letting them go stale.
  const onToggleExpandRef = useRef<(id: string) => void>(() => {});
  const onToggleExpand = useCallback((id: string) => onToggleExpandRef.current(id), []);
  const onDrillInRef = useRef<(id: string) => void>(() => {});
  const onDrillIn = useCallback((id: string) => onDrillInRef.current(id), []);

  useEffect(() => {
    onToggleExpandRef.current = (id: string): void => {
      const target = diagramRef.current.nodes.find((n) => n.id === id);
      if (!target) return;
      const willExpand = !target.expanded;
      let nextNodes = diagramRef.current.nodes.map((n) =>
        n.id === id ? { ...n, expanded: willExpand } : n,
      );
      if (willExpand) {
        nextNodes = expandWithLayout(nextNodes, id);
      }
      diagramRef.current = { ...diagramRef.current, nodes: nextNodes };
      rebuildFlow(diagramRef.current, scopeIdRef.current, onToggleExpand, onDrillIn);
    };
    onDrillInRef.current = (id: string): void => {
      const target = diagramRef.current.nodes.find((n) => n.id === id);
      if (!target) return;
      setScopeStack((prev) => [...prev, { id, label: target.label }]);
    };
  }, [rebuildFlow, onToggleExpand, onDrillIn]);

  useEffect(() => {
    if (!loading) {
      rebuildFlow(diagramRef.current, scopeId, onToggleExpand, onDrillIn);
      requestAnimationFrame(() => fitView({ duration: 200, padding: 0.2 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeId]);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      const res = await fetch(`/api/diagrams/${diagramId}`);
      if (res.status === 404) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }
      const data = (await res.json()) as DiagramApiResponse;
      if (cancelled) return;

      // Re-flow any already-expanded node's children so stale/seeded
      // positions (sized for an older, smaller default card) never overlap.
      let normalizedNodes = data.nodes;
      for (const n of data.nodes) {
        if (n.expanded) {
          normalizedNodes = expandWithLayout(normalizedNodes, n.id);
        }
      }
      diagramRef.current = { nodes: normalizedNodes, edges: data.edges };
      setDiagramName(data.name);
      setVisibility(data.visibility);
      setFolderId(data.folderId);
      setIsOwner(data.isOwner);
      readOnlyRef.current = !data.isOwner;
      setScopeStack([]);
      setSelectedNode(null);
      setSelectedEdge(null);
      setSelectedNodeIds([]);
      rebuildFlow(diagramRef.current, null, onToggleExpand, onDrillIn);
      setLoading(false);
    };
    void load();
    return (): void => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramId]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<CompositeNodeData>>[]) => {
      onNodesChange(changes);
      if (readOnlyRef.current) return;
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          diagramRef.current = {
            ...diagramRef.current,
            nodes: diagramRef.current.nodes.map((n) =>
              n.id === change.id ? { ...n, position: change.position! } : n,
            ),
          };
        }
        if (change.type === "dimensions" && change.dimensions) {
          diagramRef.current = {
            ...diagramRef.current,
            nodes: diagramRef.current.nodes.map((n) =>
              n.id === change.id
                ? n.expanded
                  ? { ...n, size: change.dimensions }
                  : { ...n, collapsedSize: change.dimensions }
                : n,
            ),
          };
        }
      }
    },
    [onNodesChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnlyRef.current || !connection.source || !connection.target) return;
      const id = `e-${connection.source}-${connection.target}-${Date.now()}`;
      const newEdge: DiagramEdgeData = {
        id,
        source: connection.source,
        target: connection.target,
        kind: "lan",
      };
      diagramRef.current = { ...diagramRef.current, edges: [...diagramRef.current.edges, newEdge] };
      setEdges((eds) => [...eds, diagramEdgeToFlowEdge(newEdge)]);
    },
    [setEdges],
  );

  const onSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
    const ids = selNodes.map((n) => n.id);
    setSelectedNodeIds(ids);
    setSelectedNode(ids.length === 1 ? diagramRef.current.nodes.find((n) => n.id === ids[0]) ?? null : null);
    setSelectedEdge(
      selEdges.length === 1 ? diagramRef.current.edges.find((e) => e.id === selEdges[0].id) ?? null : null,
    );
  }, []);

  const onUpdateNode = useCallback(
    (id: string, patch: Partial<DiagramNodeData>) => {
      if (readOnlyRef.current) return;
      diagramRef.current = {
        ...diagramRef.current,
        nodes: diagramRef.current.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      };
      setSelectedNode((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
      rebuildFlow(diagramRef.current, scopeIdRef.current, onToggleExpand, onDrillIn);
    },
    [rebuildFlow, onToggleExpand, onDrillIn],
  );

  const onUpdateEdge = useCallback(
    (id: string, patch: Partial<DiagramEdgeData>) => {
      if (readOnlyRef.current) return;
      diagramRef.current = {
        ...diagramRef.current,
        edges: diagramRef.current.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      };
      setSelectedEdge((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
      rebuildFlow(diagramRef.current, scopeIdRef.current, onToggleExpand, onDrillIn);
    },
    [rebuildFlow, onToggleExpand, onDrillIn],
  );

  const onDeleteNode = useCallback(
    (id: string) => {
      if (readOnlyRef.current) return;
      const toRemove = new Set([id, ...descendantIds(diagramRef.current.nodes, id)]);
      diagramRef.current = {
        nodes: diagramRef.current.nodes.filter((n) => !toRemove.has(n.id)),
        edges: diagramRef.current.edges.filter((e) => !toRemove.has(e.source) && !toRemove.has(e.target)),
      };
      setSelectedNode(null);
      setSelectedNodeIds([]);
      rebuildFlow(diagramRef.current, scopeIdRef.current, onToggleExpand, onDrillIn);
    },
    [rebuildFlow, onToggleExpand, onDrillIn],
  );

  const onDeleteEdge = useCallback(
    (id: string) => {
      if (readOnlyRef.current) return;
      diagramRef.current = {
        ...diagramRef.current,
        edges: diagramRef.current.edges.filter((e) => e.id !== id),
      };
      setSelectedEdge(null);
      rebuildFlow(diagramRef.current, scopeIdRef.current, onToggleExpand, onDrillIn);
    },
    [rebuildFlow, onToggleExpand, onDrillIn],
  );

  const onGroup = useCallback(
    (ids: string[]) => {
      if (readOnlyRef.current) return;
      const all = diagramRef.current.nodes;
      const members = all.filter((n) => ids.includes(n.id));
      if (members.length < 2) return;
      const parentId = members[0].parentId;
      const minX = Math.min(...members.map((n) => n.position.x)) - GROUP_PADDING;
      const minY = Math.min(...members.map((n) => n.position.y)) - GROUP_PADDING / 2;
      const maxX = Math.max(...members.map((n) => n.position.x + (n.size?.width ?? DEFAULT_COLLAPSED_SIZE.width)));
      const maxY = Math.max(...members.map((n) => n.position.y + (n.size?.height ?? DEFAULT_COLLAPSED_SIZE.height)));
      const groupId = `group-${Date.now()}`;
      const group: DiagramNodeData = {
        id: groupId,
        kind: "group",
        label: "Group",
        parentId,
        expanded: true,
        position: { x: minX, y: minY },
        size: { width: maxX - minX + GROUP_PADDING, height: maxY - minY + GROUP_PADDING },
        borderStyle: "dashed",
      };
      diagramRef.current = {
        ...diagramRef.current,
        nodes: [
          ...all.map((n) =>
            ids.includes(n.id)
              ? { ...n, parentId: groupId, position: { x: n.position.x - minX, y: n.position.y - minY } }
              : n,
          ),
          group,
        ],
      };
      setSelectedNodeIds([]);
      setSelectedNode(null);
      rebuildFlow(diagramRef.current, scopeIdRef.current, onToggleExpand, onDrillIn);
    },
    [rebuildFlow, onToggleExpand, onDrillIn],
  );

  const onUngroup = useCallback(
    (groupId: string) => {
      if (readOnlyRef.current) return;
      const all = diagramRef.current.nodes;
      const group = all.find((n) => n.id === groupId);
      if (!group) return;
      diagramRef.current = {
        ...diagramRef.current,
        nodes: all
          .filter((n) => n.id !== groupId)
          .map((n) =>
            n.parentId === groupId
              ? {
                  ...n,
                  parentId: group.parentId,
                  position: { x: n.position.x + group.position.x, y: n.position.y + group.position.y },
                }
              : n,
          ),
      };
      setSelectedNode(null);
      rebuildFlow(diagramRef.current, scopeIdRef.current, onToggleExpand, onDrillIn);
    },
    [rebuildFlow, onToggleExpand, onDrillIn],
  );

  const onAddNode = useCallback(
    (kind: NodeKind) => {
      if (readOnlyRef.current) return;
      const id = `node-${Date.now()}`;
      const newNode: DiagramNodeData = {
        id,
        kind,
        label: "New node",
        parentId: scopeIdRef.current,
        expanded: false,
        position: { x: 80, y: 80 },
        shape: "rounded",
        borderStyle: "solid",
      };
      diagramRef.current = { ...diagramRef.current, nodes: [...diagramRef.current.nodes, newNode] };
      rebuildFlow(diagramRef.current, scopeIdRef.current, onToggleExpand, onDrillIn);
    },
    [rebuildFlow, onToggleExpand, onDrillIn],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/diagrams/${diagramId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(diagramRef.current),
      });
      if (res.ok) {
        toast.success("Diagram saved");
      } else {
        toast.error("Couldn't save diagram");
      }
    } finally {
      setSaving(false);
    }
  }, [diagramId]);

  const handleRename = useCallback(
    async (name: string) => {
      setDiagramName(name);
      await fetch(`/api/diagrams/${diagramId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    },
    [diagramId],
  );

  const handleToggleVisibility = useCallback(async () => {
    const next = visibility === "public" ? "private" : "public";
    setVisibility(next);
    await fetch(`/api/diagrams/${diagramId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    });
  }, [diagramId, visibility]);

  const handleChangeFolder = useCallback(
    async (nextFolderId: string | null) => {
      setFolderId(nextFolderId);
      await fetch(`/api/diagrams/${diagramId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: nextFolderId }),
      });
    },
    [diagramId],
  );

  const handleFork = useCallback(async () => {
    setForking(true);
    try {
      const res = await fetch(`/api/diagrams/${diagramId}/fork`, { method: "POST" });
      const data = (await res.json()) as { id: string };
      router.push(`/dashboard/diagram/${data.id}`);
    } finally {
      setForking(false);
    }
  }, [diagramId, router]);

  const handleExportPng = useCallback(async () => {
    const viewportEl = wrapperRef.current?.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewportEl) return;
    void fitView({ padding: 0.1, duration: 0 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    // A literal hex color, not a CSS var resolving to oklch()/lab() — those
    // modern color functions can hang html-to-image's style serialization.
    // skipFonts avoids html-to-image trying (and hanging) on inlining
    // Next.js's optimized font files in dev mode.
    const dataUrl = await toPng(viewportEl, { backgroundColor: "#1f2121", pixelRatio: 2, skipFonts: true });
    const link = document.createElement("a");
    link.download = `${diagramName}.png`;
    link.href = dataUrl;
    link.click();
  }, [fitView, diagramName]);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  if (notFound) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        This diagram doesn&apos;t exist or isn&apos;t public.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading diagram…
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      <div ref={wrapperRef} className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-sidebar/95 px-2 py-1.5 shadow-sm backdrop-blur-sm">
              {isOwner ? (
                <Input
                  value={diagramName}
                  onChange={(e) => void handleRename(e.target.value)}
                  className="h-7 w-28 border-none bg-transparent px-1 text-sm font-medium shadow-none sm:w-40"
                />
              ) : (
                <span className="px-1 text-sm font-medium">{diagramName}</span>
              )}
              {isOwner ? (
                <button
                  type="button"
                  title={visibility === "public" ? "Public — anyone can view" : "Private — only you can view"}
                  onClick={() => void handleToggleVisibility()}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {visibility === "public" ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {visibility === "public" ? "Public" : "Private"}
                </button>
              ) : null}
              {isOwner ? <FolderPicker value={folderId} onChange={(id) => void handleChangeFolder(id)} /> : null}
            </div>
            <div className="flex items-center gap-1 rounded-lg border bg-sidebar/95 px-2 py-1.5 text-sm shadow-sm backdrop-blur-sm">
              <button
                type="button"
                className="flex items-center gap-1 rounded px-1 py-0.5 text-muted-foreground hover:text-foreground"
                onClick={() => setScopeStack([])}
              >
                <Home className="h-3.5 w-3.5" /> Top
              </button>
              {scopeStack.map((crumb, i) => (
                <span key={crumb.id} className="flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <button
                    type="button"
                    className={
                      i === scopeStack.length - 1
                        ? "max-w-[8rem] truncate rounded px-1 py-0.5 font-medium"
                        : "max-w-[8rem] truncate rounded px-1 py-0.5 text-muted-foreground hover:text-foreground"
                    }
                    onClick={() => setScopeStack((prev) => prev.slice(0, i + 1))}
                  >
                    {crumb.label}
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => void handleExportPng()}>
              <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export PNG</span>
            </Button>
            {isOwner ? (
              <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            ) : (
              <Button size="sm" onClick={() => void handleFork()} disabled={forking}>
                <GitFork className="h-3.5 w-3.5" /> {forking ? "Forking…" : "Fork to edit"}
              </Button>
            )}
          </div>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={NODE_TYPES}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          connectionMode={ConnectionMode.Loose}
          proOptions={proOptions}
          defaultEdgeOptions={{ type: "smoothstep" }}
          colorMode="dark"
          style={{ backgroundColor: "var(--background)" }}
          minZoom={0.05}
          maxZoom={2}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={32} size={1.5} color="var(--muted-foreground)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <PropertiesPanel
        readOnly={readOnly}
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        selectedNodeIds={selectedNodeIds}
        onUpdateNode={onUpdateNode}
        onUpdateEdge={onUpdateEdge}
        onDeleteNode={onDeleteNode}
        onDeleteEdge={onDeleteEdge}
        onGroup={onGroup}
        onUngroup={onUngroup}
        onAddNode={onAddNode}
      />
    </div>
  );
}

interface DiagramCanvasProps {
  diagramId: string;
}

/**
 * Wraps the canvas in a ReactFlowProvider so internal hooks (zoom, viewport)
 * work outside of a parent-provided flow context.
 * @param props Contains the diagram's id.
 * @returns The provider-wrapped canvas.
 */
export function DiagramCanvas({ diagramId }: DiagramCanvasProps): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner diagramId={diagramId} />
    </ReactFlowProvider>
  );
}
