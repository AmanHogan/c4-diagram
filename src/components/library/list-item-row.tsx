import Link from "next/link";
import { Globe, Lock, type LucideIcon } from "lucide-react";
import { DeleteItemButton } from "@/components/library/delete-item-button";

interface ListItemRowProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  meta: string;
  /** Omit for items with no public/private concept, e.g. folders. */
  visibility?: "public" | "private";
  itemLabel: string;
  extraNote?: string;
  onDelete: () => Promise<void>;
}

/**
 * One row in the diagrams/flashcards/folders list pages: icon badge, title,
 * optional description, meta line (card count/last updated), a visibility
 * pill (when applicable), and a trash button — the same shape everywhere so
 * the three list pages read as one consistent app.
 * @param props The item's display data, its delete callback, and dialog copy.
 * @returns The rendered row.
 */
export function ListItemRow({
  href,
  icon: Icon,
  title,
  description,
  meta,
  visibility,
  itemLabel,
  extraNote,
  onDelete,
}: ListItemRowProps): React.JSX.Element {
  return (
    <li className="group relative">
      <Link
        href={href}
        className="flex items-center justify-between gap-4 rounded-xl border-2 border-border/60 bg-card px-5 py-4 pr-14 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
      >
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-foreground">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{title}</p>
            {description ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{description}</p> : null}
            <p className="mt-0.5 text-sm text-muted-foreground">{meta}</p>
          </div>
        </div>
        {visibility ? (
          <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
            {visibility === "public" ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {visibility === "public" ? "Public" : "Private"}
          </span>
        ) : null}
      </Link>
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <DeleteItemButton itemName={title} itemLabel={itemLabel} extraNote={extraNote} onDelete={onDelete} />
      </div>
    </li>
  );
}
