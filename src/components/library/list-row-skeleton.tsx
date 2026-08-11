import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for a single {@link ListItemRow} — same icon-badge + two lines
 * shape — shown in a short stack while a list page's first fetch is in
 * flight, instead of a bare "Loading…" string.
 * @returns The rendered skeleton row.
 */
function ListRowSkeleton(): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 rounded-xl border-2 border-border/60 bg-card px-5 py-4">
      <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3.5 w-56" />
      </div>
    </div>
  );
}

/**
 * A short stack of {@link ListRowSkeleton}s, for the diagrams/flashcards/
 * folders list pages' initial loading state.
 * @param props How many placeholder rows to show (default 4).
 * @returns The rendered skeleton stack.
 */
export function ListRowSkeletonStack({ count = 4 }: { count?: number }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}
