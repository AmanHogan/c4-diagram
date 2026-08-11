import { cn } from "@/lib/utils";

/**
 * A pulsing placeholder block — the base primitive for every loading
 * skeleton in the app. Sizing/shape comes entirely from `className`.
 * @param props Standard div props; `className` sets size/shape.
 * @returns The rendered skeleton block.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("animate-pulse rounded-md bg-muted/60", className)} {...props} />;
}
