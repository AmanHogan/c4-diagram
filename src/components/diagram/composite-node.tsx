"use client";

import { memo } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  NODE_COLORS,
  NODE_KIND_LABELS,
  type LineStyle,
  type NodeKind,
  type NodeShape,
} from "@/lib/diagram-types";

export interface CompositeNodeData extends Record<string, unknown> {
  label: string;
  kind: NodeKind;
  description?: string;
  shape: NodeShape;
  fillColor: string;
  borderStyle: LineStyle;
  hasChildren: boolean;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
  onDrillIn: (id: string) => void;
}

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left];

const BORDER_STYLE_CSS: Record<LineStyle, string> = {
  solid: "solid",
  dashed: "dashed",
  dotted: "dotted",
};

// Diamonds are clipped (not rotated) so they still work on non-square cards
// without skewing the text inside.
const SHAPE_STYLE: Record<NodeShape, React.CSSProperties> = {
  rectangle: { borderRadius: "0.25rem" },
  rounded: { borderRadius: "1rem" },
  diamond: { borderRadius: 0, clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" },
  ellipse: { borderRadius: "50%" },
};

// Diamond/ellipse curvature eats into the corners, so their content is
// centered (and padded more) instead of left-aligned like a normal card.
const CENTERED_SHAPES: NodeShape[] = ["diamond", "ellipse"];

/**
 * A diagram node rendered as a card. Collapsed: a compact labeled card.
 * Expanded: a bordered container sized from the node's `style`, with child
 * nodes positioned inside it by React Flow via `parentId`. Clicking the body
 * drills into the node's children as a new scope; the chevron instead
 * expands children inline within the current scope.
 * @param props React Flow node props, including this node's id and data.
 * @returns The rendered node.
 */
function CompositeNodeImpl({ id, data, selected }: NodeProps): React.JSX.Element {
  const {
    label,
    kind,
    description,
    shape,
    fillColor,
    borderStyle,
    hasChildren,
    expanded,
    onToggleExpand,
    onDrillIn,
  } = data as CompositeNodeData;
  const color = fillColor || NODE_COLORS[kind];
  const centered = CENTERED_SHAPES.includes(shape);

  return (
    <div
      className="group relative h-full w-full"
      onDoubleClick={(event) => {
        if (hasChildren) {
          event.stopPropagation();
          onDrillIn(id);
        }
      }}
    >
      <NodeResizer isVisible={selected} minWidth={180} minHeight={64} color={color} handleStyle={{ width: 8, height: 8 }} />

      <div
        className="h-full w-full cursor-pointer bg-card/95 shadow-md transition-shadow hover:shadow-lg"
        style={{
          ...SHAPE_STYLE[shape],
          borderWidth: 2,
          borderStyle: BORDER_STYLE_CSS[borderStyle],
          borderColor: color,
          boxShadow: selected ? `0 0 0 3px ${color}66` : undefined,
        }}
      >
        <div
          className={
            centered
              ? "flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden p-6 text-center"
              : "flex h-full w-full flex-col gap-1 overflow-hidden p-3"
          }
        >
          <div className={centered ? "flex items-center gap-2" : "flex items-center justify-between gap-2"}>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{ backgroundColor: `${color}26`, color }}
            >
              {NODE_KIND_LABELS[kind]}
            </span>
            {hasChildren && !centered ? (
              <button
                type="button"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-muted"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleExpand(id);
                }}
              >
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : null}
          </div>
          <span className="line-clamp-2 break-words text-sm font-semibold leading-tight" title={label}>
            {label}
          </span>
          {!expanded && description ? (
            <p className="line-clamp-2 break-words text-xs text-muted-foreground" title={description}>
              {description}
            </p>
          ) : null}
          {hasChildren && centered ? (
            <button
              type="button"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-muted"
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpand(id);
              }}
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : null}
        </div>
      </div>

      {HANDLE_POSITIONS.map((position) => (
        <Handle
          key={position}
          type="source"
          position={position}
          id={position}
          className="!h-2.5 !w-2.5 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

export const CompositeNode = memo(CompositeNodeImpl);
