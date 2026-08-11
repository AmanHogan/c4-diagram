"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SortMode = "recent" | "name";

interface SortControlProps {
  value: SortMode;
  onChange: (mode: SortMode) => void;
}

/**
 * "Recently updated" (default — drives the This week/Month grouping) vs
 * "Name (A–Z)" (flat, alphabetical, no group headers) — shared by the
 * diagrams, flashcards, and folders list pages.
 * @param props The current sort mode and a change callback.
 * @returns The rendered select.
 */
export function SortControl({ value, onChange }: SortControlProps): React.JSX.Element {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortMode)}>
      <SelectTrigger size="sm" className="w-[172px] bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="recent">Recently updated</SelectItem>
        <SelectItem value="name">Name (A–Z)</SelectItem>
      </SelectContent>
    </Select>
  );
}
