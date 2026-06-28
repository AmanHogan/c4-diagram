"use client";

import { LibraryListPage } from "@/components/library/library-list-page";

/**
 * Lists the current user's diagrams with create/open actions.
 * @returns The rendered page.
 */
export default function DiagramsPage(): React.JSX.Element {
  return (
    <LibraryListPage
      title="Diagrams"
      description="Expandable, connectable node diagrams."
      listUrl="/api/diagrams"
      createUrl="/api/diagrams"
      detailHref={(id) => `/dashboard/diagram/${id}`}
      emptyLabel="No diagrams yet — create one to get started."
    />
  );
}
