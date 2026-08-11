import { cn } from "@/lib/utils";

/**
 * A plain horizontally-scrolling row (scroll-snap, no animation) — the
 * "static" carousel, as opposed to Marquee's auto-scrolling one. Just a
 * flex row with snap points; the browser's native scroll handles the rest.
 * @param props Standard div props.
 * @returns The rendered scroll row.
 */
export function StaticCarousel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      {...props}
      className={cn(
        // overflow-x-auto forces overflow-y to clip too (CSS can't mix
        // auto/visible across axes) — p-3 gives the cards' hover lift +
        // shadow room to breathe instead of getting cut off at the edge.
        "flex snap-x snap-mandatory gap-4 overflow-x-auto p-3 [scrollbar-width:thin]",
        className,
      )}
    >
      {children}
    </div>
  );
}
