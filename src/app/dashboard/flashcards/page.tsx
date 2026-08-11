"use client";

import { LibraryListPage } from "@/components/library/library-list-page";

/**
 * Lists the current user's flashcard sets with create/open actions.
 * @returns The rendered page.
 */
export default function FlashcardsPage(): React.JSX.Element {
  return (
    <LibraryListPage
      title="Your flashcard sets."
      description="Every set you've created, ready to study."
      listUrl="/api/flashcards"
      createUrl="/api/flashcards"
      detailHref={(id) => `/dashboard/flashcards/${id}`}
      emptyLabel="No flashcard sets yet — create one to get started."
      itemLabel="flashcard set"
    />
  );
}
