"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FolderClosed } from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderSummary {
  id: string;
  name: string;
}

interface FolderPickerProps {
  value: string | null;
  onChange: (folderId: string | null) => void;
  /** "sm" for tight spaces like the diagram toolbar's Details popover; "md"
   * (default) matches the taller visibility-toggle pill it usually sits
   * next to on a full page. */
  size?: "sm" | "md";
}

/**
 * "No folder / pick a folder" select, styled as a bordered pill with its
 * own chevron (the native `<select>` arrow is hidden) so it matches the
 * other pill buttons it sits next to instead of looking like a bare form
 * control. Used by diagram and flashcard editors to file an item into one
 * of the owner's folders.
 * @param props The currently assigned folder id, a change callback, and size.
 * @returns The rendered picker.
 */
export function FolderPicker({ value, onChange, size = "md" }: FolderPickerProps): React.JSX.Element {
  const [folders, setFolders] = useState<FolderSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const res = await fetch("/api/folders");
      const data = (await res.json()) as FolderSummary[];
      if (!cancelled) setFolders(data);
    };
    void load();
    return (): void => {
      cancelled = true;
    };
  }, []);

  const sm = size === "sm";

  return (
    <label
      className={cn(
        "relative flex items-center gap-1.5 rounded-lg border-2 border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground",
        sm ? "h-8 px-2 text-xs" : "h-[42px] px-4 text-sm",
      )}
    >
      <FolderClosed className={cn("shrink-0", sm ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          "appearance-none truncate bg-transparent outline-none",
          sm ? "max-w-[6rem] pr-3.5 text-xs" : "max-w-[9rem] pr-4 text-sm",
        )}
      >
        <option value="">No folder</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      <ChevronDown className={cn("pointer-events-none absolute shrink-0", sm ? "right-2 h-3 w-3" : "right-3.5 h-3.5 w-3.5")} />
    </label>
  );
}
