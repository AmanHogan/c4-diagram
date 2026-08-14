import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder matching {@link PosterCard}'s exact frame (icon badge, title,
 * a couple description lines, date + CTA chip footer) — shown in a row
 * while a dashboard/explore carousel's data is still loading, instead of a
 * bare "Loading…" string.
 * @returns The rendered skeleton card.
 */
function PosterCardSkeleton(): React.JSX.Element {
  return (
    <div className="flex h-56 w-64 shrink-0 flex-col rounded-xl border-2 border-border/60 bg-card p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
        <Skeleton className="h-5 flex-1" />
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/6" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-6 w-20 rounded-lg" />
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
