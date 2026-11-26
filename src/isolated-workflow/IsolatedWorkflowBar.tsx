import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { sanitizeIsolatedWorkflowCapability } from "./capabilities";
import { RejectDialog } from "./RejectDialog";
import {
  fetchDocumentCapabilities,
  fetchWorkflowHistory,
  postWorkflowAction,
  type DraftModuleKind,
} from "./workflowApi";
import type { WorkflowHttpError } from "./errors";

type DocumentCaps = {
  can_submit: boolean;
  can_approve: boolean;
  can_reject: boolean;
  status?: string;
};

const EMPTY: DocumentCaps = { can_submit: false, can_approve: false, can_reject: false };

function documentCaps(raw: unknown, module: DraftModuleKind): DocumentCaps {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>)[module] : null;
  const moduleCaps = sanitizeIsolatedWorkflowCapability(root);
  const document =
    root && typeof root === "object" && "document" in root
      ? (root as { document?: Record<string, unknown> }).document
      : undefined;
  if (!document || typeof document !== "object") {
    return {
      can_submit: false,
      can_approve: false,
      can_reject: false,
    };
  }
  return {
    can_submit: document.can_submit === true && moduleCaps.can_submit,
    can_approve: document.can_approve === true && moduleCaps.can_approve,
    can_reject: document.can_reject === true && moduleCaps.can_reject,
    status: typeof document.status === "string" ? document.status : undefined,
  };
}

export function IsolatedWorkflowBar({ module }: { module: DraftModuleKind }) {
  const { id } = useParams<{ id: string }>();
  const [caps, setCaps] = useState<DocumentCaps>(EMPTY);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<null | "submit" | "approve" | "reject">(null);
  const [confirm, setConfirm] = useState<null | "submit" | "approve">(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [history, setHistory] = useState<unknown[] | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      const body = await fetchDocumentCapabilities(module, id);
      setCaps(documentCaps(body, module));
      setLoadError(null);
    } catch (err) {
      setCaps(EMPTY);
      const http = err as WorkflowHttpError;
      setLoadError(http.status === 404 ? "Not found" : http.message || "Unable to load workflow permissions");
    }
    try {
      setHistory(await fetchWorkflowHistory(module, id));
    } catch {
      setHistory(null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, module]);

  const run = async (action: "submit" | "approve" | "reject", payload: Record<string, string> = {}) => {
    if (!id || pending) return;
    setPending(action);
    setActionError(null);
    try {
      await postWorkflowAction(module, id, action, payload);
      setConfirm(null);
      setRejectOpen(false);
      window.location.reload();
    } catch (err) {
      const http = err as WorkflowHttpError;
      setActionError(http.message || "Workflow action failed");
      if (http.status === 409) {
        await load();
      }
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="isolated-workflow-bar">
      {loadError && (
        <span className="text-sm text-destructive" data-testid="isolated-workflow-load-error">
          {loadError}
        </span>
      )}
      {actionError && (
        <span className="text-sm text-destructive" data-testid="isolated-workflow-action-error">
          {actionError}
        </span>
      )}
      {caps.can_submit && (
        <Button
          size="sm"
          data-testid="draft-workflow-submit"
          disabled={Boolean(pending)}
          onClick={() => setConfirm("submit")}
        >
          Submit
        </Button>
      )}
      {caps.can_approve && (
        <Button
          size="sm"
          data-testid="draft-workflow-approve"
          disabled={Boolean(pending)}
          onClick={() => setConfirm("approve")}
        >
          Approve
        </Button>
      )}
      {caps.can_reject && (
        <Button
          size="sm"
          variant="destructive"
          data-testid="draft-workflow-reject"
          disabled={Boolean(pending)}
          onClick={() => setRejectOpen(true)}
        >
          Reject
        </Button>
      )}
      {id && (
        <Link
          className="text-sm text-primary underline"
          data-testid="warehouse-documents-link"
          to={module === "sample_gift" ? `/delivery/sample-gift/${id}/warehouse` : `/delivery/export/${id}/warehouse`}
        >
          Warehouse documents
        </Link>
      )}
      {history && history.length > 0 && (
        <details className="text-sm" data-testid="isolated-workflow-history">
          <summary>Workflow history</summary>
          <ul className="mt-1 list-disc pl-4">
            {history.map((row, index) => {
              const item = row as { action?: string; user_name?: string; created_at?: string };
              return (
                <li key={`${item.action}-${index}`}>
                  {item.action}
                  {item.user_name ? ` · ${item.user_name}` : ""}
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !pending && !open && setConfirm(null)}>
        <AlertDialogContent data-testid="draft-workflow-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "approve" ? "Approve this document?" : "Submit this Draft?"}</AlertDialogTitle>
            <AlertDialogDescription>
              The isolated server will confirm the new status. This does not reserve stock or create an invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={Boolean(pending)} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              data-testid="draft-workflow-confirm-action"
              disabled={Boolean(pending)}
              onClick={() => confirm && run(confirm)}
            >
              {pending ? "Working…" : "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RejectDialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (!pending) setRejectOpen(open);
        }}
        pending={pending === "reject"}
        serverError={actionError}
        onConfirm={(reason) => run("reject", { reason })}
      />
    </div>
  );
}
