import { useRef } from "react";
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

export function DraftUnsavedChangesDialog({
  open,
  onStay,
  onDiscard,
}: {
  open: boolean;
  onStay: () => void;
  onDiscard: () => void;
}) {
  const discardingRef = useRef(false);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        if (discardingRef.current) {
          discardingRef.current = false;
          return;
        }
        onStay();
      }}
    >
      <AlertDialogContent data-testid="draft-unsaved-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Draft changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved Draft changes. If you leave this page, those changes will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="draft-unsaved-stay" onClick={onStay}>
            Stay on Page
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="draft-unsaved-discard"
            onClick={() => {
              discardingRef.current = true;
              onDiscard();
            }}
          >
            Discard Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
