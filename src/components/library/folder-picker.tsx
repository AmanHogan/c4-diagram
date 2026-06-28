"use client";

import { useEffect, useState } from "react";
import { FolderClosed } from "lucide-react";

interface FolderSummary {
  id: string;
  name: string;
}

interface FolderPickerProps {
  value: string | null;
  onChange: (folderId: string | null) => void;
}

/**
 * Compact "no folder / pick a folder" select, used by diagram and flashcard
 * editors to file an item into one of the owner's folders.
 * @param props The currently assigned folder id and a change callback.
 * @returns The rendered select.
 */
export function FolderPicker({ value, onChange }: FolderPickerProps): React.JSX.Element {
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

  return (
    <label className="flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">
      <FolderClosed className="h-3.5 w-3.5" />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="bg-transparent text-xs outline-none"
      >
        <option value="">No folder</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </label>
  );
}
