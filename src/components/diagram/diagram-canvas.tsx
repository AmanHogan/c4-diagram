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
  reconnectEdge,
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
import { ChevronRight, Download, GitFork, Home, Lock, Globe, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompositeNode, type CompositeNodeData } from "@/components/diagram/composite-node";
import { DiagramToolbar, type DiagramTool } from "@/components/diagram/diagram-toolbar";
import { PropertiesPanel } from "@/components/diagram/properties-panel";
import { FolderPicker } from "@/components/library/folder-picker";
import {
  DEFAULT_NODE_SHAPE,
  EDGE_STYLES,
  FLOW_NODE_KINDS,
  NODE_COLORS,
  type DiagramDocument,
  type DiagramEdgeData,
  type DiagramNodeData,
  type EdgeKind,
  type HandleSide,
  type NodeKind,
} from "@/lib/diagram-types";

const NODE_TYPES = { composite: CompositeNode };

const DEFAULT_COLLAPSED_SIZE = { width: 260, height: 110 };
const GROUP_PADDING = 48;

// Layout engine tuning: connected children are placed left-to-right in
// horizontal "chain" rows (one row per connected component) with generous
// gaps so smoothstep edges between them never have to route through another
// box. Disconnected children fall into a grid below all the chain rows.
const CHAIN_GAP = 96;
const ROW_GAP = 40;
const GRID_GAP = 24;
const GRID_SIDE_INSET = 24;
const GRID_TOP_INSET = 64;
const SIBLING_PUSH_GAP = 40;

// Ghost (external stand-in) node sizing/placement.
const GHOST_WIDTH = 200;
const GHOST_HEIGHT = 90;
const GHOST_GAP = 120;
const GHOST_V_GAP = 24;
const GHOST_ID_PREFIX = "ghost:";

const TEXT_NODE_DEFAULT_SIZE = { width: 160, height: 48 };

const DEFAULT_FILLED_STORAGE_KEY = "c4-diagram:default-node-filled";

/**
 * The fill style (filled vs. outline) last picked via the properties panel,
 * so newly placed nodes start out matching instead of always defaulting to
 * filled. `undefined` (unset) renders as filled — see composite-node.tsx.
 */
function loadDefaultFilled(): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(DEFAULT_FILLED_STORAGE_KEY);
    if (raw === null) return undefined;
    return JSON.parse(raw) === false ? false : undefined;
  } catch {
    return undefined;
  }
}

interface DiagramApiResponse extends DiagramDocument {
  id: string;
  name: string;
  visibility: "public" | "private";
  folderId: string | null;
  isOwner: boolean;
  ownerName: string;
}

function nodeSize(node: DiagramNodeData): { width: number; height: number } {
  return node.expanded ? node.size ?? DEFAULT_COLLAPSED_SIZE : node.collapsedSize ?? DEFAULT_COLLAPSED_SIZE;
}

function nodeRect(node: DiagramNodeData): { x: number; y: number; width: number; height: number } {
  return { x: node.position.x, y: node.position.y, ...nodeSize(node) };
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Lays out a node's children: nodes connected to each other (via edges
 * between siblings) form left-to-right horizontal chains, one row per
 * connected component, ordered largest-first; nodes with no sibling
 * connections fall into a grid below. Generous horizontal gaps between
 * chained boxes mean a straight smoothstep edge between neighbors never has
 * to route through an unrelated box.
 */
function layoutChildrenFlow(
  children: DiagramNodeData[],
  edges: DiagramEdgeData[],
  baseWidth: number,
): { positions: Map<string, { x: number; y: number }>; requiredSize: { width: number; height: number } } {
  const childIds = new Set(children.map((c) => c.id));
  const localEdges = edges.filter(
    (e) => childIds.has(e.source) && childIds.has(e.target) && e.source !== e.target,
  );

  // Union-find to group children into connected components (undirected).
  const rootOf = new Map<string, string>(children.map((c) => [c.id, c.id]));
  function find(x: string): string {
    let root = x;
    while (rootOf.get(root) !== root) root = rootOf.get(root)!;
    let cur = x;
    while (rootOf.get(cur) !== root) {
      const next = rootOf.get(cur)!;
      rootOf.set(cur, root);
      cur = next;
    }
    return root;
  }
  function union(a: string, b: string): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) rootOf.set(ra, rb);
  }
  for (const e of localEdges) union(e.source, e.target);

  const componentsById = new Map<string, string[]>();
  for (const c of children) {
    const root = find(c.id);
    const list = componentsById.get(root) ?? [];
    list.push(c.id);
    componentsById.set(root, list);
  }

  const byId = new Map(children.map((c) => [c.id, c]));
  const outgoing = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();
  for (const e of localEdges) {
    outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e.target]);
    incomingCount.set(e.target, (incomingCount.get(e.target) ?? 0) + 1);
  }

  const chains: string[][] = [];
  const singles: string[] = [];
  for (const memberIds of componentsById.values()) {
    if (memberIds.length === 1) {
      singles.push(memberIds[0]);
      continue;
    }
    // Order left-to-right by breadth-first traversal from a member with no
    // incoming edge within the component (a natural "start"); leftover
    // members (from a cycle with no clear start) are appended at the end.
    const memberSet = new Set(memberIds);
    const start = memberIds.find((id) => (incomingCount.get(id) ?? 0) === 0) ?? memberIds[0];
    const order: string[] = [];
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      order.push(cur);
      for (const next of outgoing.get(cur) ?? []) {
        if (memberSet.has(next) && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    for (const id of memberIds) {
      if (!seen.has(id)) order.push(id);
    }
    chains.push(order);
  }
  chains.sort((a, b) => b.length - a.length);

  const positions = new Map<string, { x: number; y: number }>();
  let y = GRID_TOP_INSET;
  let maxRowWidth = 0;

  for (const chain of chains) {
    let x = GRID_SIDE_INSET;
    let rowHeight = DEFAULT_COLLAPSED_SIZE.height;
    for (const id of chain) {
      const size = nodeSize(byId.get(id)!);
      positions.set(id, { x, y });
      x += size.width + CHAIN_GAP;
      rowHeight = Math.max(rowHeight, size.height);
    }
    maxRowWidth = Math.max(maxRowWidth, x - CHAIN_GAP + GRID_SIDE_INSET);
    y += rowHeight + ROW_GAP;
  }

  if (singles.length > 0) {
    const cols = Math.max(
      1,
      Math.floor(
        (Math.max(baseWidth, maxRowWidth) - GRID_SIDE_INSET * 2 + GRID_GAP) /
          (DEFAULT_COLLAPSED_SIZE.width + GRID_GAP),
      ),
    );
    singles.forEach((id, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.set(id, {
        x: GRID_SIDE_INSET + col * (DEFAULT_COLLAPSED_SIZE.width + GRID_GAP),
        y: y + row * (DEFAULT_COLLAPSED_SIZE.height + GRID_GAP),
      });
    });
    const rows = Math.ceil(singles.length / cols);
    maxRowWidth = Math.max(
      maxRowWidth,
      GRID_SIDE_INSET * 2 + cols * DEFAULT_COLLAPSED_SIZE.width + (cols - 1) * GRID_GAP,
    );
    y += rows * (DEFAULT_COLLAPSED_SIZE.height + GRID_GAP);
  }

  return {
    positions,
    requiredSize: {
      width: Math.max(baseWidth, maxRowWidth),
      height: y + GRID_SIDE_INSET,
    },
  };
}

/** Shifts any sibling now overlapping `nodeId`'s (just-grown) box to the
 * right of it, cascading so a chain of overlapping siblings all clear it. */
function pushOverlappingSiblings(nodes: DiagramNodeData[], nodeId: string): DiagramNodeData[] {
  let result = nodes;
  const target = result.find((n) => n.id === nodeId);
  if (!target) return result;
  const targetRect = nodeRect(target);
  const siblings = result
    .filter((n) => n.id !== nodeId && n.parentId === target.parentId && n.position.x >= target.position.x)
    .sort((a, b) => a.position.x - b.position.x);

  let occupiedRight = targetRect.x + targetRect.width;
  for (const sibling of siblings) {
    const rect = nodeRect(sibling);
    if (rectsOverlap(rect, { ...targetRect, width: occupiedRight - targetRect.x }) || rect.x < occupiedRight + SIBLING_PUSH_GAP) {
      const newX = occupiedRight + SIBLING_PUSH_GAP;
      result = result.map((n) => (n.id === sibling.id ? { ...n, position: { x: newX, y: n.position.y } } : n));
      occupiedRight = newX + rect.width;
    } else {
      occupiedRight = Math.max(occupiedRight, rect.x + rect.width);
    }
  }
  return result;
}

/** Walks up from `nodeId` growing each ancestor's size, as needed, so the
 * whole chain of containers still fully encloses the (possibly just-grown)
 * subtree beneath it. */
function growParentChain(nodes: DiagramNodeData[], nodeId: string): DiagramNodeData[] {
  let result = nodes;
  let currentId: string | null = nodeId;
  while (currentId) {
    const current = result.find((n) => n.id === currentId);
    if (!current || current.parentId === null) break;
    const parent = result.find((n) => n.id === current.parentId);
    if (!parent) break;
    const parentSize = parent.size ?? DEFAULT_COLLAPSED_SIZE;
    const currentSize = nodeSize(current);
    const requiredWidth = current.position.x + currentSize.width + GRID_SIDE_INSET;
    const requiredHeight = current.position.y + currentSize.height + GRID_SIDE_INSET;
    if (requiredWidth <= parentSize.width && requiredHeight <= parentSize.height) break;
    const newParentSize = {
      width: Math.max(parentSize.width, requiredWidth),
      height: Math.max(parentSize.height, requiredHeight),
    };
    result = result.map((n) => (n.id === parent.id ? { ...n, size: newParentSize } : n));
    currentId = parent.id;
  }
  return result;
}

/** Lays out `id`'s children, grows `id` to fit them, pushes any now-overlapping
 * siblings of `id` out of the way, and grows `id`'s own ancestor chain if it's
 * now too small to contain it — returning the updated node list. */
function expandWithLayout(nodes: DiagramNodeData[], edges: DiagramEdgeData[], id: string): DiagramNodeData[] {
  const target = nodes.find((n) => n.id === id);
  if (!target) return nodes;
  const children = nodes.filter((n) => n.parentId === id);
  if (children.length === 0) return nodes;
  const baseWidth = target.size?.width ?? DEFAULT_COLLAPSED_SIZE.width;
  const { positions, requiredSize } = layoutChildrenFlow(children, edges, baseWidth);
  const newSize = {
    width: Math.max(target.size?.width ?? DEFAULT_COLLAPSED_SIZE.width, requiredSize.width),
    height: Math.max(target.size?.height ?? DEFAULT_COLLAPSED_SIZE.height, requiredSize.height),
  };
  let result = nodes.map((n) => {
    if (n.id === id) return { ...n, size: newSize };
    const pos = positions.get(n.id);
    return pos ? { ...n, position: pos } : n;
  });
  result = pushOverlappingSiblings(result, id);
  result = growParentChain(result, id);
  return result;
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
  isLightTheme: boolean,
  onToggleExpand: (id: string) => void,
  onDrillIn: (id: string) => void,
  onStartTextEdit: (id: string) => void,
  onCommitTextEdit: (id: string, text: string, cancel?: boolean) => void,
): Node<CompositeNodeData> {
  const size = nodeSize(node);
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
      filled: node.filled,
      fontSize: node.fontSize,
      hasChildren,
      expanded: node.expanded,
      readOnly,
      isLightTheme,
      onToggleExpand,
      onDrillIn,
      onStartTextEdit,
      onCommitTextEdit,
    },
  };
}

/** A ghost node's synthetic id — its data still carries the real underlying
 * node id in `originalId` (via the closure below), but the flow graph needs
 * a distinct id since the same real node could appear as both a source-side
 * and target-side ghost across different edges. */
function ghostNodeId(role: "source" | "target", originalId: string): string {
  return `${GHOST_ID_PREFIX}${role}:${originalId}`;
}

function diagramNodeToGhostFlowNode(
  role: "source" | "target",
  original: DiagramNodeData | undefined,
  originalId: string,
  position: { x: number; y: number },
  isLightTheme: boolean,
): Node<CompositeNodeData> {
  return {
    id: ghostNodeId(role, originalId),
    type: "composite",
    position,
    draggable: false,
    selectable: false,
    style: { width: GHOST_WIDTH, height: GHOST_HEIGHT },
    data: {
      label: original?.label ?? "External",
      kind: original?.kind ?? "external-access",
      description: original?.description,
      shape: original?.shape ?? "rounded",
      fillColor: original ? original.fillColor ?? NODE_COLORS[original.kind] : NODE_COLORS["external-access"],
      borderStyle: "dashed",
      hasChildren: false,
      expanded: false,
      readOnly: true,
      isGhost: true,
      isLightTheme,
      onToggleExpand: (): void => {},
      onDrillIn: (): void => {},
      onStartTextEdit: (): void => {},
      onCommitTextEdit: (): void => {},
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

/** Walks up `nodeId`'s parent chain to the nearest ancestor (or itself) that
 * is currently visible, so an edge to/from a node inside a collapsed
 * container still renders (pointing at the container). Returns null if the
 * chain never reaches a visible node — i.e. `nodeId` is entirely outside the
 * current scope. */
function resolveToVisible(
  nodeId: string,
  visibleIds: Set<string>,
  nodesById: Map<string, DiagramNodeData>,
): string | null {
  let currentId: string | undefined = nodeId;
  while (currentId) {
    if (visibleIds.has(currentId)) return currentId;
    currentId = nodesById.get(currentId)?.parentId ?? undefined;
  }
  return null;
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
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
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
  const [tool, setTool] = useState<DiagramTool>("select");
  const [pendingNodeKind, setPendingNodeKind] = useState<NodeKind | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const clipboardRef = useRef<{ nodes: DiagramNodeData[]; edges: DiagramEdgeData[] } | null>(null);
  const { fitView, screenToFlowPosition } = useReactFlow();

  const readOnly = !isOwner;
  const readOnlyRef = useRef(readOnly);
  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);

  // Excalidraw-style canvas theme (independent of the rest of the app, which
  // is dark-only) — saved to the user's account, so it follows them across
  // devices and survives login, not just this browser.
  const [canvasTheme, setCanvasTheme] = useState<"dark" | "light">("dark");
  const canvasThemeRef = useRef(canvasTheme);
  useEffect(() => {
    canvasThemeRef.current = canvasTheme;
  }, [canvasTheme]);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const res = await fetch("/api/me/diagram-canvas-mode");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { mode: "dark" | "light" };
      if (cancelled || data.mode === canvasThemeRef.current) return;
      setCanvasTheme(data.mode);
      setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, isLightTheme: data.mode === "light" } })));
    };
    void load();
    return (): void => {
      cancelled = true;
    };
  }, [setNodes]);

  const scopeId = scopeStack.at(-1)?.id ?? null;
  const scopeIdRef = useRef<string | null>(null);
  useEffect(() => {
    scopeIdRef.current = scopeId;
  }, [scopeId]);

  // Inline text editing, like onToggleExpand/onDrillIn below, is handed to
  // every node's data and needs a stable identity — route through refs.
  const onStartTextEditRef = useRef<(id: string) => void>(() => {});
  const onStartTextEdit = useCallback((id: string) => onStartTextEditRef.current(id), []);
  const onCommitTextEditRef = useRef<(id: string, text: string, cancel?: boolean) => void>(() => {});
  const onCommitTextEdit = useCallback(
    (id: string, text: string, cancel?: boolean) => onCommitTextEditRef.current(id, text, cancel),
    [],
  );

  const rebuildFlow = useCallback(
    (
      doc: DiagramDocument,
      currentScopeId: string | null,
      onToggleExpand: (id: string) => void,
      onDrillIn: (id: string) => void,
    ) => {
      const nodesById = new Map(doc.nodes.map((n) => [n.id, n]));
      const visible = visibleDiagramNodes(doc.nodes, currentScopeId);
      const visibleIds = new Set(visible.map((n) => n.id));

      const flowNodes: Node<CompositeNodeData>[] = visible.map((n) =>
        diagramNodeToFlowNode(
          n,
          doc.nodes.some((c) => c.parentId === n.id),
          currentScopeId,
          readOnlyRef.current,
          canvasThemeRef.current === "light",
          onToggleExpand,
          onDrillIn,
          onStartTextEdit,
          onCommitTextEdit,
        ),
      );

      // Resolve every edge's endpoints to the nearest visible ancestor, or to
      // a ghost stand-in if the endpoint is entirely outside this scope — so
      // edges into collapsed nodes and edges crossing a drilled-into scope's
      // boundary both still render instead of silently disappearing.
      type GhostRole = "source" | "target";
      const ghostOriginals = new Map<string, GhostRole>(); // key: role:originalId
      const resolved: { edge: DiagramEdgeData; source: string; target: string }[] = [];
      const seenPairs = new Set<string>();

      for (const edge of doc.edges) {
        const resolvedSource = resolveToVisible(edge.source, visibleIds, nodesById);
        const resolvedTarget = resolveToVisible(edge.target, visibleIds, nodesById);
        if (resolvedSource === null && resolvedTarget === null) continue;

        let sourceId: string;
        let targetId: string;

        if (resolvedSource === null) {
          ghostOriginals.set(`source:${edge.source}`, "source");
          sourceId = ghostNodeId("source", edge.source);
        } else {
          sourceId = resolvedSource;
        }

        if (resolvedTarget === null) {
          ghostOriginals.set(`target:${edge.target}`, "target");
          targetId = ghostNodeId("target", edge.target);
        } else {
          targetId = resolvedTarget;
        }

        if (sourceId === targetId) continue; // collapsed onto itself — nothing to show
        const pairKey = `${sourceId}->${targetId}`;
        if (seenPairs.has(pairKey)) continue; // multiple original edges collapsed onto the same pair
        seenPairs.add(pairKey);
        resolved.push({ edge, source: sourceId, target: targetId });
      }

      if (ghostOriginals.size > 0) {
        const bounds = visible.reduce(
          (acc, n) => {
            const rect = nodeRect(n);
            return {
              minX: Math.min(acc.minX, rect.x),
              maxX: Math.max(acc.maxX, rect.x + rect.width),
              minY: Math.min(acc.minY, rect.y),
            };
          },
          { minX: 0, maxX: 0, minY: 0 },
        );
        let leftY = bounds.minY;
        let rightY = bounds.minY;
        for (const [key, role] of ghostOriginals) {
          const originalId = key.slice(role.length + 1);
          const x = role === "source" ? bounds.minX - GHOST_GAP - GHOST_WIDTH : bounds.maxX + GHOST_GAP;
          const y = role === "source" ? leftY : rightY;
          if (role === "source") leftY += GHOST_HEIGHT + GHOST_V_GAP;
          else rightY += GHOST_HEIGHT + GHOST_V_GAP;
          flowNodes.push(
            diagramNodeToGhostFlowNode(
              role,
              nodesById.get(originalId),
              originalId,
              { x, y },
              canvasThemeRef.current === "light",
            ),
          );
        }
      }

      setNodes(flowNodes);
      setEdges(resolved.map(({ edge, source, target }) => diagramEdgeToFlowEdge({ ...edge, source, target })));
    },
    [setNodes, setEdges, onStartTextEdit, onCommitTextEdit],
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
        nextNodes = expandWithLayout(nextNodes, diagramRef.current.edges, id);
      }
      diagramRef.current = { ...diagramRef.current, nodes: nextNodes };
      rebuildFlow(diagramRef.current, scopeIdRef.current, onToggleExpand, onDrillIn);
    };
    onDrillInRef.current = (id: string): void => {
      // Always drills in, even into a childless node — that's how you add
      // the node's first child (you can't add one without a scope to add it
      // into).
      const target = diagramRef.current.nodes.find((n) => n.id === id);
      if (!target) return;
      setScopeStack((prev) => [...prev, { id, label: target.label }]);
    };
    onStartTextEditRef.current = (id: string): void => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, isEditingText: true } } : n)));
    };
    onCommitTextEditRef.current = (id: string, text: string, cancel?: boolean): void => {
      if (!cancel) {
        diagramRef.current = {
          ...diagramRef.current,
          nodes: diagramRef.current.nodes.map((n) => (n.id === id ? { ...n, label: text } : n)),
        };
        setSelectedNode((prev) => (prev && prev.id === id ? { ...prev, label: text } : prev));
      }
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, isEditingText: false, label: cancel ? n.data.label : text } }
            : n,
        ),
      );
    };
  }, [rebuildFlow, onToggleExpand, onDrillIn, setNodes]);

  useEffect(() => {
    if (!loading) {
      rebuildFlow(diagramRef.current, scopeId, onToggleExpand, onDrillIn);
      requestAnimationFrame(() => fitView({ duration: 200, padding: 0.2 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeId]);

  const selectedNodeIdsRef = useRef<string[]>([]);
  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds;
  }, [selectedNodeIds]);

  const selectedEdgeRef = useRef<DiagramEdgeData | null>(null);
  useEffect(() => {
    selectedEdgeRef.current = selectedEdge;
  }, [selectedEdge]);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;

      if (e.key === "Escape" && (tool !== "select" || pendingNodeKind)) {
        e.preventDefault();
        setTool("select");
        setPendingNodeKind(null);
        return;
      }

      if (mod && e.key === "c") {
        const ids = selectedNodeIdsRef.current;
        if (ids.length === 0) return;
        e.preventDefault();
        const idSet = new Set(ids);
        const copiedNodes = diagramRef.current.nodes.filter((n) => idSet.has(n.id));
        const copiedEdges = diagramRef.current.edges.filter(
          (edge) => idSet.has(edge.source) && idSet.has(edge.target),
        );
        clipboardRef.current = { nodes: copiedNodes, edges: copiedEdges };
        toast.success(`Copied ${copiedNodes.length} node${copiedNodes.length > 1 ? "s" : ""}`);
        return;
      }

      if (mod && e.key === "v") {
        if (readOnlyRef.current || !clipboardRef.current) return;
        e.preventDefault();
        const { nodes: srcNodes, edges: srcEdges } = clipboardRef.current;
        if (srcNodes.length === 0) return;

        const idMap = new Map<string, string>();
        const now = Date.now();
        srcNodes.forEach((n, i) => {
          idMap.set(n.id, `node-${now}-${i}`);
        });

        const pastedNodes: DiagramNodeData[] = srcNodes.map((n) => ({
          ...n,
          id: idMap.get(n.id)!,
          parentId: idMap.get(n.parentId ?? "") ?? scopeIdRef.current,
          position: { x: n.position.x + 40, y: n.position.y + 40 },
        }));

        const pastedEdges: DiagramEdgeData[] = srcEdges.map((edge, i) => ({
          ...edge,
          id: `e-${idMap.get(edge.source)}-${idMap.get(edge.target)}-${now}-${i}`,
          source: idMap.get(edge.source) ?? edge.source,
          target: idMap.get(edge.target) ?? edge.target,
        }));

        diagramRef.current = {
          nodes: [...diagramRef.current.nodes, ...pastedNodes],
          edges: [...diagramRef.current.edges, ...pastedEdges],
        };
        rebuildFlow(diagramRef.current, scopeIdRef.current, onToggleExpand, onDrillIn);
        toast.success(`Pasted ${pastedNodes.length} node${pastedNodes.length > 1 ? "s" : ""}`);
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && !mod) {
        if (readOnlyRef.current) return;
        const ids = selectedNodeIdsRef.current;
        if (ids.length > 0) {
          e.preventDefault();
          const toRemove = new Set<string>();
          for (const id of ids) {
            toRemove.add(id);
            for (const desc of descendantIds(diagramRef.current.nodes, id)) {
              toRemove.add(desc);
            }
          }
          diagramRef.current = {
            nodes: diagramRef.current.nodes.filter((n) => !toRemove.has(n.id)),
            edges: diagramRef.current.edges.filter(
              (edge) => !toRemove.has(edge.source) && !toRemove.has(edge.target),
            ),
          };
          setSelectedNode(null);
          setSelectedNodeIds([]);
          rebuildFlow(diagramRef.current, scopeIdRef.current, onToggleExpand, onDrillIn);
          return;
        }
        const edge = selectedEdgeRef.current;
        if (edge) {
          e.preventDefault();
          diagramRef.current = {
            ...diagramRef.current,
            edges: diagramRef.current.edges.filter((ed) => ed.id !== edge.id),
          };
          setSelectedEdge(null);
          rebuildFlow(diagramRef.current, scopeIdRef.current, onToggleExpand, onDrillIn);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return (): void => {
      window.removeEventListener("keydown", handler);
    };
  }, [rebuildFlow, onToggleExpand, onDrillIn, tool, pendingNodeKind]);

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
          normalizedNodes = expandWithLayout(normalizedNodes, data.edges, n.id);
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
      const sourceNode = diagramRef.current.nodes.find((n) => n.id === connection.source);
      const defaultKind: EdgeKind =
        sourceNode && FLOW_NODE_KINDS.includes(sourceNode.kind) ? "flow" : "lan";
      const newEdge: DiagramEdgeData = {
        id,
        source: connection.source,
        target: connection.target,
        kind: defaultKind,
        sourceHandle: (connection.sourceHandle as HandleSide | null) ?? undefined,
        targetHandle: (connection.targetHandle as HandleSide | null) ?? undefined,
      };
      diagramRef.current = { ...diagramRef.current, edges: [...diagramRef.current.edges, newEdge] };
      setEdges((eds) => [...eds, diagramEdgeToFlowEdge(newEdge)]);
    },
    [setEdges],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (readOnlyRef.current) return;
      const source = newConnection.source ?? oldEdge.source;
      const target = newConnection.target ?? oldEdge.target;
      diagramRef.current = {
        ...diagramRef.current,
        edges: diagramRef.current.edges.map((e) =>
          e.id === oldEdge.id
            ? {
                ...e,
                source,
                target,
                sourceHandle: (newConnection.sourceHandle as HandleSide | null) ?? e.sourceHandle,
                targetHandle: (newConnection.targetHandle as HandleSide | null) ?? e.targetHandle,
              }
            : e,
        ),
      };
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    [setEdges],
  );

  const onSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
    // React Flow fires a selection-change event with empty arrays whenever
    // focus leaves the canvas — e.g. clicking into a properties-panel input
    // — which used to be misread as "the user deselected everything" and
    // closed the panel mid-edit. Ignore empty events; deselecting is instead
    // handled explicitly by onPaneClick below.
    if (selNodes.length === 0 && selEdges.length === 0) return;
    const ids = selNodes.map((n) => n.id);
    setSelectedNodeIds(ids);
    setSelectedNode(ids.length === 1 ? diagramRef.current.nodes.find((n) => n.id === ids[0]) ?? null : null);
    setSelectedEdge(
      selEdges.length === 1 ? diagramRef.current.edges.find((e) => e.id === selEdges[0].id) ?? null : null,
    );
  }, []);

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (readOnlyRef.current) {
        setTool("select");
        setPendingNodeKind(null);
        setSelectedNode(null);
        setSelectedEdge(null);
        setSelectedNodeIds([]);
        return;
      }

      // Text tool: place a text node at the click point and start typing
      // into it immediately, Excalidraw-style. Reverts to the Select tool
      // after one placement.
      if (tool === "text") {
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const id = `node-${Date.now()}`;
        const newNode: DiagramNodeData = {
          id,
          kind: "text",
          label: "",
          parentId: scopeIdRef.current,
          expanded: false,
          position,
          collapsedSize: TEXT_NODE_DEFAULT_SIZE,
        };
        diagramRef.current = { ...diagramRef.current, nodes: [...diagramRef.current.nodes, newNode] };
        rebuildFlow(diagramRef.current, scopeIdRef.current, onToggleExpand, onDrillIn);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id
              ? { ...n, selected: true, data: { ...n.data, isEditingText: true } }
              : { ...n, selected: false },
          ),
        );
        setSelectedNode(newNode);
        setSelectedNodeIds([id]);
        setSelectedEdge(null);
        setTool("select");
        return;
      }

      // Node tool: a kind must already be armed (picked from the properties
      // panel, which only shows the picker while this tool is active) —
      // clicking places one of that kind at the click point.
      if (tool === "node" && pendingNodeKind) {
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const id = `node-${Date.now()}`;
        const newNode: DiagramNodeData = {
          id,
          kind: pendingNodeKind,
          label: "New node",
          parentId: scopeIdRef.current,
          expanded: false,
          position,
          shape: DEFAULT_NODE_SHAPE[pendingNodeKind] ?? "rounded",
          borderStyle: "solid",
          filled: loadDefaultFilled(),
        };
        diagramRef.current = { ...diagramRef.current, nodes: [...diagramRef.current.nodes, newNode] };
        rebuildFlow(diagramRef.current, scopeIdRef.current, onToggleExpand, onDrillIn);
        setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === id })));
        setSelectedNode(newNode);
        setSelectedNodeIds([id]);
        setSelectedEdge(null);
        setTool("select");
        setPendingNodeKind(null);
        return;
      }

      setSelectedNode(null);
      setSelectedEdge(null);
      setSelectedNodeIds([]);
    },
    [tool, pendingNodeKind, screenToFlowPosition, rebuildFlow, onToggleExpand, onDrillIn, setNodes],
  );

  const onUpdateNode = useCallback(
    (id: string, patch: Partial<DiagramNodeData>) => {
      if (readOnlyRef.current) return;
      // Remember the last-picked fill style so the next node you place
      // starts out the same way, instead of always defaulting to filled.
      if (patch.filled !== undefined) {
        try {
          window.localStorage.setItem(DEFAULT_FILLED_STORAGE_KEY, JSON.stringify(patch.filled));
        } catch {
          // localStorage unavailable — the default just won't persist.
        }
      }
      diagramRef.current = {
        ...diagramRef.current,
        nodes: diagramRef.current.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      };
      setSelectedNode((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
      const updated = diagramRef.current.nodes.find((n) => n.id === id);
      if (!updated) return;
      // Patch only this node's data in place rather than rebuilding the
      // whole node list — a brand-new array/objects makes React Flow think
      // the selection changed and fire a deselection event, which closed the
      // properties panel on every keystroke.
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  label: updated.label,
                  kind: updated.kind,
                  description: updated.description,
                  shape: updated.shape ?? "rounded",
                  fillColor: updated.fillColor ?? NODE_COLORS[updated.kind],
                  borderStyle: updated.borderStyle ?? "solid",
                  filled: updated.filled,
                  fontSize: updated.fontSize,
                },
              }
            : n,
        ),
      );
    },
    [setNodes],
  );

  const onUpdateEdge = useCallback(
    (id: string, patch: Partial<DiagramEdgeData>) => {
      if (readOnlyRef.current) return;
      diagramRef.current = {
        ...diagramRef.current,
        edges: diagramRef.current.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      };
      setSelectedEdge((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
      const updated = diagramRef.current.edges.find((e) => e.id === id);
      if (!updated) return;
      setEdges((eds) => eds.map((e) => (e.id === id ? diagramEdgeToFlowEdge(updated) : e)));
    },
    [setEdges],
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

  // Arms a kind for placement while the Node tool is active — the actual
  // node gets created by onPaneClick, at wherever the user clicks.
  const onArmNodeKind = useCallback((kind: NodeKind) => {
    setPendingNodeKind(kind);
  }, []);

  const onSelectTool = useCallback((next: DiagramTool) => {
    setTool(next);
    setPendingNodeKind(null);
  }, []);

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
    const dataUrl = await toPng(viewportEl, {
      backgroundColor: canvasTheme === "light" ? "#ffffff" : "#1f2121",
      pixelRatio: 2,
      skipFonts: true,
    });
    const link = document.createElement("a");
    link.download = `${diagramName}.png`;
    link.href = dataUrl;
    link.click();
  }, [fitView, diagramName, canvasTheme]);

  const handleToggleCanvasTheme = useCallback(() => {
    const next = canvasThemeRef.current === "dark" ? "light" : "dark";
    setCanvasTheme(next);
    void fetch("/api/me/diagram-canvas-mode", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    });
    // Patch the flag into every existing flow node's data in place (same
    // pattern as onUpdateNode) instead of a full rebuildFlow, so toggling
    // the theme never disturbs the current selection.
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, isLightTheme: next === "light" } })));
  }, [setNodes]);

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
    <div className={`flex h-full w-full ${canvasTheme === "light" ? "diagram-canvas-light" : ""}`}>
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
            <DiagramToolbar
              tool={tool}
              onSelectTool={onSelectTool}
              readOnly={readOnly}
              pendingNodeKind={pendingNodeKind}
              onArmNodeKind={onArmNodeKind}
            />
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
            <Button
              size="sm"
              variant="outline"
              title={canvasTheme === "light" ? "Switch to dark canvas" : "Switch to light canvas"}
              onClick={handleToggleCanvasTheme}
            >
              {canvasTheme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </Button>
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
          onReconnect={onReconnect}
          edgesReconnectable={!readOnly}
          onSelectionChange={onSelectionChange}
          onPaneClick={onPaneClick}
          nodeTypes={NODE_TYPES}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          connectionMode={ConnectionMode.Loose}
          proOptions={proOptions}
          defaultEdgeOptions={{ type: "smoothstep" }}
          colorMode={canvasTheme}
          style={{
            backgroundColor: "var(--background)",
            cursor: tool !== "select" ? "crosshair" : undefined,
          }}
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
