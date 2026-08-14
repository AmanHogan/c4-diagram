import { PiCardsFill, PiGraphFill } from "react-icons/pi";
import type { IconType } from "react-icons";

export interface DashboardItem {
  type: "diagram" | "flashcard-set";
  id: string;
  name: string;
  description?: string | null;
  /** User-supplied cover image URL — falls back to {@link iconFor}'s icon
   * when unset. */
  coverImageUrl?: string | null;
  ownerName?: string;
  updatedAt: string;
}

/** Where a dashboard/explore item's card links to. */
export function itemHref(item: DashboardItem): string {
  return item.type === "diagram" ? `/dashboard/diagram/${item.id}` : `/dashboard/flashcards/${item.id}`;
}

/** A stack of cards for flashcard sets, a node graph for diagrams — the
 * default poster-card art shown when there's no cover image. Shared by the
 * dashboard's carousels and the search page's explore strip. */
export function iconFor(type: DashboardItem["type"]): IconType {
  return type === "diagram" ? PiGraphFill : PiCardsFill;
}

/** The poster card's bottom-right CTA chip label — a visual affordance
 * reinforcing that the whole card is clickable, worded per item type. */
export function ctaLabelFor(type: DashboardItem["type"]): string {
  return type === "diagram" ? "Open" : "Study";
}
