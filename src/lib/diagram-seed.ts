import type { DiagramDocument, DiagramEdgeData, DiagramNodeData } from "@/lib/diagram-types";

function node(
  id: string,
  kind: DiagramNodeData["kind"],
  label: string,
  parentId: string | null,
  position: { x: number; y: number },
  options: Partial<Pick<DiagramNodeData, "expanded" | "size" | "description">> = {},
): DiagramNodeData {
  return { id, kind, label, parentId, position, expanded: options.expanded ?? false, ...options };
}

function edge(
  id: string,
  source: string,
  target: string,
  kind: DiagramEdgeData["kind"],
  label?: string,
): DiagramEdgeData {
  return { id, source, target, kind, label };
}

/**
 * Hand-authored starting topology for the k3s home platform, used the first
 * time the diagram is opened (before anything has been saved).
 */
export function buildSeedDiagram(): DiagramDocument {
  const nodes: DiagramNodeData[] = [
    // Physical / network layer
    node("att-router", "network", "AT&T Router (192.168.1.254)", null, { x: 0, y: 0 }),
    node("netgear-switch", "network", "Netgear GS305 Switch", null, { x: 0, y: 150 }),

    node("pve1", "physical", "pve1 — HP ProDesk 600 G3 (Proxmox)", null, { x: -300, y: 320 }, { size: { width: 260, height: 220 } }),
    node("vm-k3s-server", "vm", "VM: k3s-server (192.168.1.200, ts 100.112.249.53)", "pve1", { x: 20, y: 40 }, { size: { width: 220, height: 140 } }),
    node("k3s-server-proc", "cluster-component", "k3s server — control plane (SQLite, no etcd)", "vm-k3s-server", { x: 15, y: 40 }),

    node("pve2", "physical", "pve2 — HP ProDesk 600 G3 (Proxmox)", null, { x: 100, y: 320 }, { size: { width: 260, height: 220 } }),
    node("vm-k3s-agent", "vm", "VM: k3s-agent (192.168.1.201)", "pve2", { x: 20, y: 40 }, { size: { width: 220, height: 140 } }),
    node("k3s-agent-proc", "cluster-component", "k3s agent — worker", "vm-k3s-agent", { x: 15, y: 40 }),

    // Cluster, expandable composite containing networking + namespaces
    node(
      "k3s-cluster",
      "cluster-component",
      "k3s Cluster",
      null,
      { x: -400, y: 650 },
      { size: { width: 1400, height: 900 }, description: "Single control-plane k3s cluster spanning pve1/pve2." },
    ),

    node(
      "flannel",
      "cluster-component",
      "Flannel (CNI)",
      "k3s-cluster",
      { x: 40, y: 60 },
      { size: { width: 360, height: 160 }, description: "Pod-to-pod networking." },
    ),
    node("flannel-pve1", "cluster-component", "flanneld (pve1 node)", "flannel", { x: 20, y: 40 }),
    node("flannel-pve2", "cluster-component", "flanneld (pve2 node)", "flannel", { x: 200, y: 40 }),
    node("flannel-vxlan", "network", "VXLAN overlay", "flannel", { x: 110, y: 100 }),

    node(
      "traefik",
      "cluster-component",
      "Traefik (bundled ingress)",
      "k3s-cluster",
      { x: 440, y: 60 },
    ),

    node(
      "ns-argocd",
      "namespace",
      "argocd",
      "k3s-cluster",
      { x: 40, y: 260 },
      { size: { width: 240, height: 140 } },
    ),
    node("argocd-server", "workload", "ArgoCD server (GitOps sync)", "ns-argocd", { x: 20, y: 40 }),

    node(
      "ns-cicd",
      "namespace",
      "cicd",
      "k3s-cluster",
      { x: 320, y: 260 },
      { size: { width: 280, height: 160 } },
    ),
    node("jenkins", "workload", "Jenkins (Kaniko builds)", "ns-cicd", { x: 20, y: 40 }),
    node("incluster-registry", "workload", "In-cluster Docker registry", "ns-cicd", { x: 20, y: 100 }),

    node(
      "ns-data-platform",
      "namespace",
      "data-platform",
      "k3s-cluster",
      { x: 640, y: 260 },
      { size: { width: 240, height: 140 }, description: "Phase 5, just completed." },
    ),
    node("minio", "workload", "MinIO (S3-compatible object store)", "ns-data-platform", { x: 20, y: 40 }),

    node(
      "ns-commitments",
      "namespace",
      "commitments",
      "k3s-cluster",
      { x: 40, y: 460 },
      { size: { width: 280, height: 200 } },
    ),
    node("commitments-app", "workload", "Next.js app", "ns-commitments", { x: 20, y: 40 }),
    node("commitments-mongo", "workload", "MongoDB 4.4 (pinned, AVX crash)", "ns-commitments", { x: 20, y: 100 }),
    node("commitments-backup", "workload", "Nightly backup CronJob", "ns-commitments", { x: 20, y: 160 }),

    node(
      "ns-portfolio",
      "namespace",
      "portfolio",
      "k3s-cluster",
      { x: 360, y: 460 },
      { size: { width: 240, height: 120 }, description: "Exists but unhealthy." },
    ),
    node("portfolio-mongo", "workload", "MongoDB (crash-looping, 2500+ restarts)", "ns-portfolio", { x: 20, y: 40 }),

    node("ns-monitoring", "namespace", "monitoring", "k3s-cluster", { x: 640, y: 460 }, { description: "Namespace exists, not yet detailed." }),

    node(
      "ns-metallb-system",
      "namespace",
      "metallb-system",
      "k3s-cluster",
      { x: 40, y: 700 },
      { size: { width: 280, height: 140 } },
    ),
    node("metallb-controller", "workload", "MetalLB controller", "ns-metallb-system", { x: 20, y: 40 }),
    node("metallb-speaker", "workload", "MetalLB speaker (hands out .245/.246)", "ns-metallb-system", { x: 20, y: 90 }),

    node(
      "ns-cloudflare",
      "namespace",
      "cloudflare",
      "k3s-cluster",
      { x: 360, y: 700 },
    ),
    node("cloudflared", "workload", "cloudflared pod", "ns-cloudflare", { x: 20, y: 40 }),

    // External access, top level
    node(
      "tailscale",
      "external-access",
      "Tailscale",
      null,
      { x: 1100, y: 0 },
      { size: { width: 320, height: 160 }, description: "Reaches admin UIs from outside the LAN." },
    ),
    node("tailscale-coordination", "external-access", "Tailscale coordination server (cloud)", "tailscale", { x: 20, y: 40 }),
    node("tailscale-admin-access", "external-access", "Admin UI access (Jenkins/ArgoCD/Headlamp/MinIO via NodePort)", "tailscale", { x: 20, y: 100 }),

    node(
      "public-internet",
      "external-access",
      "amanhogan.com (public)",
      null,
      { x: 1100, y: 250 },
      { description: "Currently 502 — orphaned route to a deleted hello-world service." },
    ),
  ];

  const edges: DiagramEdgeData[] = [
    edge("e-router-switch", "att-router", "netgear-switch", "lan"),
    edge("e-switch-pve1", "netgear-switch", "pve1", "lan"),
    edge("e-switch-pve2", "netgear-switch", "pve2", "lan"),
    edge("e-server-agent-lan", "vm-k3s-server", "vm-k3s-agent", "lan", "192.168.1.200 ↔ .201"),
    edge("e-server-agent-api", "k3s-server-proc", "k3s-agent-proc", "overlay", "k3s API / kubelet"),
    edge("e-flannel-vxlan", "flannel-pve1", "flannel-pve2", "overlay", "VXLAN overlay"),
    edge("e-tailscale-server", "vm-k3s-server", "tailscale", "tailscale", "100.112.249.53"),
    edge("e-tailscale-admin", "tailscale", "tailscale-admin-access", "tailscale"),
    edge("e-cloudflared-public", "cloudflared", "public-internet", "routes-to", "502 — orphaned route"),
    edge("e-argocd-sync", "argocd-server", "k3s-cluster", "provisions", "syncs manifests from git"),
    edge("e-jenkins-registry", "jenkins", "incluster-registry", "provisions", "Kaniko build push"),
    edge("e-app-mongo", "commitments-app", "commitments-mongo", "stores-in"),
    edge("e-backup-mongo", "commitments-backup", "commitments-mongo", "stores-in", "nightly backup"),
    edge("e-metallb-jenkins", "metallb-speaker", "jenkins", "lan", ".246 LoadBalancer IP"),
    edge("e-metallb-registry", "metallb-speaker", "incluster-registry", "lan", ".245 LoadBalancer IP"),
    edge("e-traefik-app", "traefik", "commitments-app", "routes-to", "ingress"),
  ];

  return { nodes, edges };
}
