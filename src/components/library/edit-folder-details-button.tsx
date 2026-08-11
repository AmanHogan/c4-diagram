"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface EditFolderDetailsButtonProps {
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}

/**
 * Small pencil button + popover for renaming a folder and giving it a
 * description — folders have no visibility/folder-of-their-own concept, so
 * this is a lighter version of the diagram canvas's "Edit details" button.
 * @param props The folder's current name/description and their setters.
 * @returns The rendered button + popover.
 */
export function EditFolderDetailsButton({
  name,
  onNameChange,
  description,
  onDescriptionChange,
}: EditFolderDetailsButtonProps): React.JSX.Element {
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
    <div
      ref={ref}
      className="relative"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        title="Edit name and description"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground ${
          open ? "bg-accent text-foreground" : ""
        }`}
      >
        <Pencil className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 flex w-72 flex-col gap-3 rounded-lg border bg-popover p-3 text-xs shadow-md">
          <label className="flex flex-col gap-1">
            Name
            <Input value={name} onChange={(e) => onNameChange(e.target.value)} className="h-8 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            Description
            <Textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Add a description…"
              className="min-h-[60px] text-xs"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
