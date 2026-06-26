import { DiagramCanvas } from "@/components/diagram/diagram-canvas";

/**
 * Full-bleed diagram page: the dashboard's content area becomes the canvas.
 * @returns The rendered diagram page.
 */
export default function DiagramPage(): React.JSX.Element {
  return (
    <div className="h-[calc(100vh-3.5rem-3rem)] w-full">
      <DiagramCanvas />
    </div>
  );
}
