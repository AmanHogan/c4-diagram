import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";

interface PosterCardProps {
  href: string;
  /** Default art shown in the header badge in the absence of a cover image. */
  icon: IconType;
  /** User-supplied cover image — takes over the header badge when set. */
  coverImageUrl?: string | null;
  title: string;
  /** The set/diagram's own description, if it has one — truncated rather
   * than pushing the card taller. */
  description?: string | null;
  /** A single trailing date, e.g. "8/10/2026". */
  date?: string;
  /** Label for the bottom-right CTA chip, e.g. "Study" or "Open diagram".
   * Purely a visual affordance — the whole card is already the link — but
   * makes it obvious at a glance that the card opens something. */
  ctaLabel: string;
  className?: string;
}

/**
 * A simple poster tile for the dashboard's carousels: a small icon/cover
 * badge next to the title, a truncated description, and a footer with the
 * date plus an explicit "Open →" style CTA chip. The whole card is a single
 * link — the CTA is a visual affordance, not a separate click target — so
 * it's unambiguous that the card (and that chip) both do the same thing.
 * @param props The link target, title/description/date, CTA label, and
 * optional icon or cover image.
 * @returns The rendered card.
 */
export function PosterCard({
  href,
  icon: Icon,
  coverImageUrl,
  title,
  description,
  date,
  ctaLabel,
  className,
}: PosterCardProps): React.JSX.Element {
  return (
    <Link
      href={href}
      className={cn(
        // Named group ("card", not the bare default) — the Marquee this
        // sits in also uses an unnamed .group for its own pause-on-hover
        // behavior, and a bare group-hover below would match *that*
        // ancestor too, highlighting every card's chip at once instead of
        // just the hovered one.
        "group/card flex h-56 w-64 shrink-0 snap-start flex-col rounded-xl border-2 border-border/60 bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10 text-foreground">
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied URLs, not a local/optimizable asset
            <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon className="h-[18px] w-[18px]" />
          )}
        </span>
        {/* line-clamp, not truncate — a long name wraps to a second line
            instead of getting cut off mid-word. */}
        <p className="line-clamp-2 text-lg leading-tight font-bold">{title}</p>
      </div>

      {description ? (
        <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">{description}</p>
      ) : (
        <div className="flex-1" />
      )}

      <div className="mt-3 flex shrink-0 items-center justify-between">
        {date ? <p className="truncate text-sm text-muted-foreground">{date}</p> : <span />}
        <span className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors group-hover/card:border-primary">
          {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

/**
 * Same card frame as {@link PosterCard}, but a dashed-border "create one"
 * CTA — pads a carousel out to a minimum count so it never looks sparse.
 * @param props The link target and label.
 * @returns The rendered CTA card.
 */
export function VerticalEmptyCard({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}): React.JSX.Element {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-56 w-64 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground",
        className,
      )}
    >
      <Plus className="h-7 w-7" />
      {label}
    </Link>
  );
}
