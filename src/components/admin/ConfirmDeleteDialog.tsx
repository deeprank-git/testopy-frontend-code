import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
  itemLabel?: string;
  /** Override the entire description text */
  description?: string;
  /** Override the confirm button label (default: "Delete", or "Archive" in archive mode) */
  confirmLabel?: string;
  /** "archive" = soft delete wording (item can be restored). Default "delete". */
  mode?: "delete" | "archive";
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
  itemLabel = "this item",
  description,
  confirmLabel,
  mode = "delete",
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            {description ??
              (mode === "archive"
                ? `Archive ${itemLabel}? It will be hidden from students. You can restore it from the Archived filter.`
                : `Are you sure you want to delete ${itemLabel}? This action cannot be undone.`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending
              ? "Please wait…"
              : (confirmLabel ?? (mode === "archive" ? "Archive" : "Delete"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
