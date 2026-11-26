import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { rejectionReasonError, trimmedRejectionReason } from "./errors";

export function RejectDialog({
  open,
  onOpenChange,
  pending,
  serverError,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  serverError: string | null;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (!next) {
          onOpenChange(false);
          return;
        }
        onOpenChange(true);
      }}
    >
      <AlertDialogContent data-testid="draft-reject-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Reject submitted document</AlertDialogTitle>
          <AlertDialogDescription>
            A reason is required. Rejected is terminal; the document cannot return to Draft.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="draft-reject-reason">Rejection reason</Label>
          <Textarea
            id="draft-reject-reason"
            data-testid="draft-reject-reason"
            value={reason}
            disabled={pending}
            onChange={(event) => {
              setReason(event.target.value);
              setLocalError(null);
            }}
          />
          {(localError || serverError) && (
            <p className="text-sm text-destructive" data-testid="draft-reject-error">
              {localError || serverError}
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            data-testid="draft-reject-confirm"
            disabled={pending}
            onClick={() => {
              const problem = rejectionReasonError(reason);
              if (problem) {
                setLocalError(problem);
                return;
              }
              onConfirm(trimmedRejectionReason(reason));
            }}
          >
            {pending ? "Rejecting…" : "Confirm reject"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
