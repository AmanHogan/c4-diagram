"use client";

import { MousePointer2, Shapes, Type } from "lucide-react";
import { InlineKindPicker } from "@/components/diagram/kind-picker";
import type { NodeKind } from "@/lib/diagram-types";

export type DiagramTool = "select" | "node" | "text";

interface DiagramToolbarProps {
  tool: DiagramTool;
  onSelectTool: (tool: DiagramTool) => void;
  readOnly?: boolean;
  /** The kind armed for placement while the Node tool is active. */
  pendingNodeKind: NodeKind | null;
  onArmNodeKind: (kind: NodeKind) => void;
}

const TOOLS: { id: DiagramTool; label: string; icon: typeof MousePointer2; hint: string }[] = [
  { id: "select", label: "Select", icon: MousePointer2, hint: "V" },
  { id: "node", label: "Node", icon: Shapes, hint: "N" },
  { id: "text", label: "Text", icon: Type, hint: "T" },
];

/**
 * Excalidraw/Blender-style tool switcher: pick a tool, then click the canvas
 * to use it. Node pops the kind picker open directly beneath this toolbar
 * (right where you clicked, not in the far-right properties panel) while
 * it's active; Text places and immediately starts inline editing on click.
 * @param props The active tool, a setter, the armed node kind, and whether
 * editing is disabled.
 * @returns The rendered floating toolbar.
 */
export function DiagramToolbar({
  tool,
  onSelectTool,
  readOnly,
  pendingNodeKind,
  onArmNodeKind,
}: DiagramToolbarProps): React.JSX.Element | null {
  if (readOnly) return null;
  return (
    <div className="pointer-events-auto relative">
      <div className="flex items-center gap-1 rounded-lg border bg-sidebar/95 p-1 shadow-sm backdrop-blur-sm">
        {TOOLS.map(({ id, label, icon: Icon, hint }) => (
          <button
            key={id}
            type="button"
            title={`${label} (${hint})`}
            onClick={() => onSelectTool(id)}
            className={
              tool === id
                ? "flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground"
                : "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            }
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      {tool === "node" ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-72">
          <InlineKindPicker onPick={onArmNodeKind} currentKind={pendingNodeKind ?? undefined} />
          <p className="mt-1.5 rounded-md border bg-sidebar/95 px-2 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm">
            {pendingNodeKind
              ? "Click anywhere on the canvas to place it."
              : "Pick a kind, then click the canvas to place it."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
