import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder matching {@link PosterCard}'s exact frame (icon badge, title,
 * divider, a few preview lines) — shown in a row while a dashboard/explore
 * carousel's data is still loading, instead of a bare "Loading…" string.
 * @returns The rendered skeleton card.
 */
function PosterCardSkeleton(): React.JSX.Element {
  return (
    <div className="flex h-80 w-64 shrink-0 flex-col rounded-xl border-2 border-border/60 bg-card p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
        <Skeleton className="h-5 flex-1" />
      </div>
      <div className="my-4 border-t border-border/60" />
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
        <Skeleton className="h-3.5 w-4/6" />
        <Skeleton className="h-3.5 w-3/6" />
      </div>
    </div>
  );
}

/**
 * A short row of {@link PosterCardSkeleton}s, matching a carousel's layout.
 * @param props How many placeholder cards to show (default 4).
 * @returns The rendered skeleton row.
 */
export function PosterCardSkeletonRow({ count = 4 }: { count?: number }): React.JSX.Element {
  return (
    <div className="flex gap-4 overflow-hidden p-3">
      {Array.from({ length: count }).map((_, i) => (
        <PosterCardSkeleton key={i} />
      ))}
    </div>
  );
}
