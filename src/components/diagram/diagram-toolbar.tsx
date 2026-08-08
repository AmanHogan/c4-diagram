"use client";

import { MousePointer2, Shapes, Type } from "lucide-react";

export type DiagramTool = "select" | "node" | "text";

interface DiagramToolbarProps {
  tool: DiagramTool;
  onSelectTool: (tool: DiagramTool) => void;
  readOnly?: boolean;
}

const TOOLS: { id: DiagramTool; label: string; icon: typeof MousePointer2; hint: string }[] = [
  { id: "select", label: "Select", icon: MousePointer2, hint: "V" },
  { id: "node", label: "Node", icon: Shapes, hint: "N" },
  { id: "text", label: "Text", icon: Type, hint: "T" },
];

/**
 * Excalidraw/Blender-style tool switcher: pick a tool, then click the canvas
 * to use it. Node needs a kind picked from the properties panel first (which
 * only shows its "Add node" section while this tool is active); Text places
 * and immediately starts inline editing on click.
 * @param props The active tool, a setter, and whether editing is disabled.
 * @returns The rendered floating toolbar.
 */
export function DiagramToolbar({ tool, onSelectTool, readOnly }: DiagramToolbarProps): React.JSX.Element | null {
  if (readOnly) return null;
  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-lg border bg-sidebar/95 p-1 shadow-sm backdrop-blur-sm">
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
  );
}
