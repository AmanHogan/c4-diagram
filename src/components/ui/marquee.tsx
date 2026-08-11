import { cn } from "@/lib/utils";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Pause the scroll animation on hover — via CSS `animation-play-state`,
   * so children remain plain, always-clickable elements throughout. */
  pauseOnHover?: boolean;
  reverse?: boolean;
  /** How many times to repeat the children track — needs enough copies to
   * fill the container width edge-to-edge with no gap, so a handful of
   * items still reads as continuous rather than a visibly short loop. */
  repeat?: number;
}

/**
 * An infinitely-scrolling row (the "auto-scrolling card carousel" pattern
 * from Magic UI's Marquee component): a pure CSS transform animation, no
 * JS driving it, so it costs nothing to run and never blocks pointer
 * events on its children.
 * @param props Standard div props plus `pauseOnHover`/`reverse`/`repeat`.
 * @returns The rendered marquee track.
 */
export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  repeat = 3,
  children,
  ...props
}: MarqueeProps): React.JSX.Element {
  return (
    <div
      {...props}
      className={cn(
        // p-3 gives the cards' hover lift + shadow room so overflow-hidden
        // (required for the seamless loop) doesn't clip them at the edge.
        "group flex w-full overflow-hidden p-3 [--duration:32s] [--gap:1rem]",
        className,
      )}
      style={{ gap: "var(--gap)" }}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          aria-hidden={i > 0}
          className={cn(
            "flex shrink-0 animate-marquee items-stretch justify-around",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
            reverse && "[animation-direction:reverse]",
          )}
          style={{ gap: "var(--gap)" }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
