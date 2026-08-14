# Roadmap / wishlist

Ideas that have been discussed but aren't built yet — logged here so they
don't get lost, not a commitment to build them in order.

## Flashcards: notes section

A companion "Notes" area alongside a flashcard set's "Learning" section
(the existing known/learning card-status split in
[flashcard-set-view.tsx](src/components/flashcards/flashcard-set-view.tsx)
already implies this pairing conceptually, even though there's no notes UI
yet). Roughly:

- A place to group notes per flashcard set, written in Markdown — a
  streamlined way to keep source material/documents next to the cards
  made from them, not a full document editor.
- Needs a markdown *render* view (there's already a
  `MarkdownContent` component used elsewhere in flashcard-set-view.tsx —
  check whether it's reusable here before building a new renderer).
- Stretch/future: a split view — notes on one side, flashcard editing on
  the other — so cards can be written while looking at the source note.
  Explicitly "wishful," not scoped yet.

Not designed yet: where notes live in the data model (own collection vs.
a field on the flashcard set), whether a set can have multiple notes or
one, and how the nav/routing exposes it (a tab on the set page is the
obvious first guess).

## UI

- ~~Sidebar nav~~ — done, see [app-sidebar.tsx](src/components/app-sidebar.tsx).
  Search moved back to a centered bar in the top header
  ([header-bar.tsx](src/components/dashboard/header-bar.tsx)).
