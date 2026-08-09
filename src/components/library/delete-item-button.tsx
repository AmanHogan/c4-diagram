"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteItemButtonProps {
  /** Name shown in the confirmation dialog, e.g. the diagram/folder's name. */
  itemName: string;
  /** Noun used in the dialog copy, e.g. "diagram", "flashcard set", "folder". */
  itemLabel: string;
  /** Extra sentence appended to the dialog body — e.g. clarifying that a
   * folder's contents survive its deletion instead of getting deleted too. */
  extraNote?: string;
  onDelete: () => Promise<void>;
}

/**
 * Trash icon that opens a confirm dialog before calling `onDelete` — shared
 * by the diagrams, flashcards, and folders list rows so deleting always asks
 * first, never fires on a single misclick.
 * @param props The item's display name/label and the delete callback.
 * @returns The rendered trash button plus its (portal-rendered) dialog.
 */
export function DeleteItemButton({
  itemName,
  itemLabel,
  extraNote,
  onDelete,
}: DeleteItemButtonProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async (): Promise<void> => {
    setDeleting(true);
    try {
      await onDelete();
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        title={`Delete ${itemLabel}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{itemName}&rdquo;?</DialogTitle>
          <DialogDescription>
            This will permanently delete this {itemLabel}. This can&apos;t be undone.
            {extraNote ? ` ${extraNote}` : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
