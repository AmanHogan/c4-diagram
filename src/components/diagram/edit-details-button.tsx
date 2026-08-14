"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Globe, Lock, Image as ImageIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FolderPicker } from "@/components/library/folder-picker";

interface EditDetailsButtonProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  coverImageUrl: string;
  onCoverImageUrlChange: (value: string) => void;
  visibility: "public" | "private";
  onToggleVisibility: () => void;
  folderId: string | null;
  onChangeFolder: (folderId: string | null) => void;
}

/**
 * Consolidates the diagram's description, visibility, and folder — three
 * controls that used to sit directly in the always-visible toolbar — behind
 * a single "Edit details" button and a small popover, so the toolbar itself
 * only shows the name plus the tools people reach for constantly.
 * @param props The current description/visibility/folder and their setters.
 * @returns The rendered button + popover.
 */
export function EditDetailsButton({
  description,
  onDescriptionChange,
  coverImageUrl,
  onCoverImageUrlChange,
  visibility,
  onToggleVisibility,
  folderId,
  onChangeFolder,
}: EditDetailsButtonProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return (): void => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="Edit description, visibility, and folder"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-7 items-center gap-1 rounded px-1.5 text-xs hover:bg-accent hover:text-foreground ${
          open ? "bg-accent text-foreground" : "text-muted-foreground"
        }`}
      >
        <Pencil className="h-3.5 w-3.5" /> Details
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 flex w-72 flex-col gap-3 rounded-lg border bg-popover p-3 text-xs shadow-md">
          <label className="flex flex-col gap-1">
            Description
            <Textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Add a description…"
              className="min-h-[60px] text-xs"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" /> Cover image URL
            </span>
            <Input
              value={coverImageUrl}
              onChange={(e) => onCoverImageUrlChange(e.target.value)}
              placeholder="https://… (optional, defaults to an icon)"
              className="h-7 text-xs"
            />
          </label>
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Visibility</span>
            <button
              type="button"
              title={visibility === "public" ? "Public — anyone can view" : "Private — only you can view"}
              onClick={onToggleVisibility}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {visibility === "public" ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {visibility === "public" ? "Public" : "Private"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Folder</span>
            <FolderPicker value={folderId} onChange={onChangeFolder} size="sm" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
