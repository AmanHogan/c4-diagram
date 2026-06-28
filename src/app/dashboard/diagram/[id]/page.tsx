import { DiagramCanvas } from "@/components/diagram/diagram-canvas";

interface DiagramPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Full-bleed diagram page: the dashboard's content area becomes the canvas
 * for the diagram identified by the route's id.
 * @param props Route params containing the diagram id.
 * @returns The rendered diagram page.
 */
export default async function DiagramPage({ params }: DiagramPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return (
    <div className="h-[calc(100vh-3.5rem-3rem)] w-full">
      <DiagramCanvas diagramId={id} />
    </div>
  );
}
