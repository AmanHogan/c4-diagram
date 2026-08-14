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
        // The mask-image is the "fade at the edges" effect: fully opaque
        // through the middle, fading to transparent over the outer 48px on
        // each side, so cards scrolling past the edge dissolve out instead
        // of getting a hard visual cutoff.
        "flex snap-x snap-mandatory gap-4 overflow-x-auto p-3 [scrollbar-width:thin]",
        "[mask-image:linear-gradient(to_right,transparent,black_48px,black_calc(100%_-_48px),transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_48px,black_calc(100%_-_48px),transparent)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
