export type NodeKind =
  | "physical"
  | "vm"
  | "network"
  | "cluster-component"
  | "namespace"
  | "workload"
  | "external-access"
  | "group";

export type EdgeKind =
  | "lan"
  | "tailscale"
  | "overlay"
  | "routes-to"
  | "provisions"
  | "stores-in";

export type NodeShape = "rectangle" | "rounded" | "diamond" | "ellipse";
export type LineStyle = "solid" | "dashed" | "dotted";
export type ArrowStyle = "forward" | "both" | "none";

export interface DiagramNodeData {
  id: string;
  kind: NodeKind;
  label: string;
  /** Id of the containing node, or null at the top level. */
  parentId: string | null;
  /** Whether this node's children are currently rendered inline. */
  expanded: boolean;
  position: { x: number; y: number };
  /** Size while expanded (sized to fit children). */
  size?: { width: number; height: number };
  /** Size while collapsed, if the user has manually resized it. */
  collapsedSize?: { width: number; height: number };
  description?: string;
  shape?: NodeShape;
  /** Overrides the kind's default accent color. */
  fillColor?: string;
  borderStyle?: LineStyle;
}

export interface DiagramEdgeData {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  label?: string;
  lineStyle?: LineStyle;
  arrowStyle?: ArrowStyle;
}

export interface DiagramDocument {
  nodes: DiagramNodeData[];
  edges: DiagramEdgeData[];
}

export const EDGE_STYLES: Record<EdgeKind, { stroke: string; lineStyle: LineStyle }> = {
  lan: { stroke: "#60a5fa", lineStyle: "solid" },
  tailscale: { stroke: "#a78bfa", lineStyle: "dashed" },
  overlay: { stroke: "#fbbf24", lineStyle: "dashed" },
  "routes-to": { stroke: "#34d399", lineStyle: "solid" },
  provisions: { stroke: "#f472b6", lineStyle: "solid" },
  "stores-in": { stroke: "#94a3b8", lineStyle: "dotted" },
};

export const NODE_COLORS: Record<NodeKind, string> = {
  physical: "#64748b",
  vm: "#3b82f6",
  network: "#06b6d4",
  "cluster-component": "#8b5cf6",
  namespace: "#f59e0b",
  workload: "#10b981",
  "external-access": "#f43f5e",
  group: "#94a3b8",
};

export const NODE_KIND_LABELS: Record<NodeKind, string> = {
  physical: "Physical",
  vm: "VM",
  network: "Network",
  "cluster-component": "Cluster component",
  namespace: "Namespace",
  workload: "Workload",
  "external-access": "External access",
  group: "Group",
};

export const EDGE_KIND_LABELS: Record<EdgeKind, string> = {
  lan: "LAN",
  tailscale: "Tailscale",
  overlay: "Overlay",
  "routes-to": "Routes to",
  provisions: "Provisions",
  "stores-in": "Stores in",
};
