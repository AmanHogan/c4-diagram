"use client";

import { LibraryListPage } from "@/components/library/library-list-page";

/**
 * Lists the current user's diagrams with create/open actions.
 * @returns The rendered page.
 */
export default function DiagramsPage(): React.JSX.Element {
  return (
    <LibraryListPage
      title="Your architecture diagrams."
      description="Every diagram you've built, ready to open."
      listUrl="/api/diagrams"
      createUrl="/api/diagrams"
      detailHref={(id) => `/dashboard/diagram/${id}`}
      emptyLabel="No diagrams yet — create one to get started."
      itemLabel="diagram"
    />
  );
}
