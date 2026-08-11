import Link from "next/link";
import { Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PosterCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  /** The set/diagram's own description, if it has one — shown right below
   * the divider, above the preview list. */
  description?: string;
  meta?: string;
  /** Short preview lines shown as a bulleted list below the divider — e.g.
   * a flashcard set's first few terms. Fades out (CSS mask, not a hard
   * cutoff) if there are more than fit. Omit for nothing to show there. */
  items?: string[];
  /** Background + icon color for the header badge — defaults to a neutral
   * grey rather than a per-type color. */
  accentClassName?: string;
  className?: string;
}

/**
 * A structured "pricing card"-style tile — title + icon badge, a divider,
 * then an optional bulleted preview list that fades out at the bottom
 * instead of cutting off hard — for the dashboard's static (non-scrolling)
 * carousels.
 * @param props The link target, icon/title/meta, optional preview items,
 * and accent color.
 * @returns The rendered card.
 */
export function PosterCard({
  href,
  icon: Icon,
  title,
  description,
  meta,
  items,
  accentClassName,
  className,
}: PosterCardProps): React.JSX.Element {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-80 w-64 shrink-0 snap-start flex-col rounded-xl border-2 border-border/60 bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            accentClassName ?? "bg-white/10 text-foreground",
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {/* line-clamp, not truncate — a long name wraps to a second line
            instead of getting cut off mid-word. */}
        <p className="line-clamp-2 text-lg leading-tight font-bold">{title}</p>
      </div>

      <div className="my-4 border-t border-border/60" />

      <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent_92%)]">
        <div className="flex flex-col gap-2.5">
          {description ? <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p> : null}
          {items && items.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {items.map((term, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/70" />
                  <span className="truncate">{term}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {meta ? <p className="mt-3 shrink-0 truncate text-sm text-muted-foreground">{meta}</p> : null}
    </Link>
  );
}

/**
 * Same card frame as {@link PosterCard}, but a dashed-border "create one"
 * CTA — pads a carousel out to a minimum count so it never looks sparse.
 * @param props The link target and label.
 * @returns The rendered CTA card.
 */
export function VerticalEmptyCard({ href, label }: { href: string; label: string }): React.JSX.Element {
  return (
    <Link
      href={href}
      className="flex h-80 w-64 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
    >
      <Plus className="h-7 w-7" />
      {label}
    </Link>
  );
}
