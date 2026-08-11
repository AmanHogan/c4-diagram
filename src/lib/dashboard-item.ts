import { BookOpen, Workflow } from "lucide-react";

export interface DashboardItem {
  type: "diagram" | "flashcard-set";
  id: string;
  name: string;
  ownerName?: string;
  updatedAt: string;
}

/** Where a dashboard/explore item's card links to. */
export function itemHref(item: DashboardItem): string {
  return item.type === "diagram" ? `/dashboard/diagram/${item.id}` : `/dashboard/flashcards/${item.id}`;
}

/** An open book for study material, a workflow for architecture — same
 * neutral treatment as the poster cards use by default (no per-type color).
 * Shared by the dashboard's carousels and the search page's explore strip. */
export function iconFor(type: DashboardItem["type"]): typeof BookOpen {
  return type === "diagram" ? Workflow : BookOpen;
}
