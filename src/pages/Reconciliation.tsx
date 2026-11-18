import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  GitCompare,
  ListFilter,
  Loader2,
  Plus,
  RefreshCw,
  Scale,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { NAVY_TEAL_SCOPE_CLASS } from "@/lib/navyTealTheme";
import { cn } from "@/lib/utils";
import {
  ActionIconButton,
  asList,
  fieldClass,
  fieldWrapClass,
  KpiCard,
  labelClass,
  requiredMark,
  selectItemClass,
  selectPanelClass,
} from "@/components/transport/transportUi";

type ReconStatus = "DRAFT" | "PENDING_VERIFICATION" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CLOSED" | string;

interface ReconciliationRun {
  id: number;
  reconciliation_no: string;
  loading_number?: string | null;
  total_delivered_value?: number | string | null;
  total_collection_value?: number | string | null;
  total_return_value?: number | string | null;
  variance_amount?: number | string | null;
  cash_in_hand?: number | string | null;
  status?: ReconStatus;
  created_at?: string | null;
}

function formatMoney(value: number) {
  return `৳${Number(value).toFixed(2)}`;
}

function money(value: unknown) {
  return Number(value ?? 0);
}

function statusValue(row: ReconciliationRun) {
  const status = row.status as ReconStatus | { value?: string } | undefined;
  if (!status) return "";
  if (typeof status === "string") return status;
  if (typeof status === "object" && status.value) return String(status.value);
  return String(status);
}

function isRejected(row: ReconciliationRun) {
  return statusValue(row) === "REJECTED";
}

function statusLabel(status: string) {
  if (status === "DRAFT") return "Draft";
  if (status === "PENDING_VERIFICATION") return "Pending verification";
  if (status === "PENDING_APPROVAL") return "Pending approval";
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED") return "Rejected";
  if (status === "CLOSED") return "Closed";
  return status || "—";
}

function StatusFilterOption({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof ListFilter;
  label: string;
  tone: "navy" | "green" | "amber" | "red" | "purple";
}) {
  const toneClass = {
    navy: "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
    green: "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]",
    amber: "bg-[#FFFBEB] text-[#B45309] dark:bg-[#3B2A0A] dark:text-[#FBBF24]",
    red: "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]",
    purple: "bg-[#F3E8FF] text-[#7C3AED] dark:bg-[#2E1064] dark:text-[#C4B5FD]",
  }[tone];

  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md", toneClass)}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      {label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-[#64748B] dark:text-[#A9B8CC]">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]">{value}</p>
    </div>
  );
}

function DecisionDialog({
  open,
  variant,
  run,
  reason,
  busy,
  onReasonChange,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  variant: "approve" | "reject";
  run: ReconciliationRun | null;
  reason: string;
  busy: boolean;
  onReasonChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const isReject = variant === "reject";
  const variance = money(run?.variance_amount);
  const hasVariance = Math.abs(variance) > 0.01;
  const reasonReady = !isReject || reason.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent
        className={cn(
          NAVY_TEAL_SCOPE_CLASS,
          "max-w-[520px] gap-0 overflow-hidden rounded-[20px] border border-[#E3EAF3] p-0 shadow-[0_24px_48px_rgba(15,23,42,0.16)] dark:border-[#2C3B50] dark:bg-[#151F30]",
        )}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <div className="border-b border-[#E3EAF3] px-5 py-4 dark:border-[#2C3B50]">
          <DialogHeader className="space-y-0 text-left">
            <div className="flex items-start gap-3 pr-6">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  isReject
                    ? "bg-[#FEF2F2] text-[#DC2626] dark:bg-[#3B1212] dark:text-[#FCA5A5]"
                    : "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
                )}
              >
                {isReject ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {isReject ? "Reject this reconciliation?" : "Approve this reconciliation?"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-relaxed text-[#64748B] dark:text-[#A9B8CC]">
                  {isReject
                    ? "This run will be marked rejected and leave the pending list."
                    : "Confirm the assignment totals below before approving."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {run ? (
          <div className="space-y-3 px-5 py-4">
            <div className="rounded-xl border border-[#E3EAF3] bg-[#F8FBFF] p-3 dark:border-[#2C3B50] dark:bg-[#1B283B]">
              <p className="font-mono text-sm font-semibold text-[#0C4DA1] dark:text-[#70ADFF]">{run.reconciliation_no}</p>
              <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#A9B8CC]">Loading {run.loading_number || "—"}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <InfoRow label="Delivered" value={formatMoney(money(run.total_delivered_value))} />
                <InfoRow label="Collected" value={formatMoney(money(run.total_collection_value))} />
                <InfoRow label="Returns" value={formatMoney(money(run.total_return_value))} />
                <InfoRow
                  label="Variance"
                  value={
                    <span className={hasVariance ? "text-[#B91C1C]" : "text-[#15803D]"}>{formatMoney(variance)}</span>
                  }
                />
                <InfoRow label="Status" value={statusLabel(statusValue(run))} />
              </div>
            </div>
            {isReject ? (
              <div className={fieldWrapClass}>
                <Label className={labelClass} htmlFor="reject-reason">
                  Reason {requiredMark}
                </Label>
                <Textarea
                  id="reject-reason"
                  value={reason}
                  onChange={(event) => onReasonChange(event.target.value)}
                  placeholder="Why is this reconciliation being rejected?"
                  rows={3}
                  className="min-h-[72px] rounded-lg border border-[#CBD5E1] text-[13px] shadow-none focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]"
                />
              </div>
            ) : null}
            <div
              className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
                isReject || hasVariance
                  ? "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]"
                  : "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
              )}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {isReject
                  ? "Rejection is recorded in audit history. The run will no longer appear in pending reconciliations."
                  : hasVariance
                    ? "Open variance must be resolved before the server will approve this run."
                    : "Approval records the reviewer and timestamp. The run leaves the pending list."}
              </span>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 border-t border-[#E3EAF3] bg-[#F8FAFC] px-5 py-3 dark:border-[#2C3B50] dark:bg-[#1B283B] sm:space-x-0">
          <Button type="button" variant="ntSecondary" disabled={busy} className="!h-9" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !reasonReady}
            onClick={onConfirm}
            className={cn(
              "!h-9 rounded-lg border-0 text-white shadow-none",
              isReject ? "bg-[#DC2626] hover:bg-[#B91C1C]" : "bg-[#0C4DA1] hover:bg-[#0A3F86]",
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isReject ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {busy
              ? isReject
                ? "Rejecting..."
                : "Approving..."
              : isReject
                ? "Reject reconciliation"
                : "Approve reconciliation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Reconciliation() {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [loadingNumber, setLoadingNumber] = useState("");
  const [decision, setDecision] = useState<{ type: "approve" | "reject"; run: ReconciliationRun } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    document.title = "Post-Delivery Reconciliation | Renata";
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["reconciliation-pending"],
    queryFn: async () => asList<ReconciliationRun>(await apiEndpoints.reconciliation.pending()),
  });

  const pending = data || [];

  const createMutation = useMutation({
    mutationFn: (ln: string) => apiEndpoints.reconciliation.createFromAssignment(ln),
    onSuccess: () => {
      toast({ title: "Reconciliation created" });
      setShowCreate(false);
      setLoadingNumber("");
      queryClient.invalidateQueries({ queryKey: ["reconciliation-pending"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.reconciliation.approve(id),
    onSuccess: () => {
      toast({ title: "Reconciliation approved" });
      setDecision(null);
      queryClient.invalidateQueries({ queryKey: ["reconciliation-pending"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => apiEndpoints.reconciliation.reject(id, reason),
    onSuccess: () => {
      toast({ title: "Reconciliation rejected" });
      setDecision(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["reconciliation-pending"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const decisionBusy = approveMutation.isPending || rejectMutation.isPending;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return pending.filter((row) => {
      const status = statusValue(row);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!term) return true;
      return [row.reconciliation_no, row.loading_number, statusLabel(status)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [pending, searchTerm, statusFilter]);

  const openRuns = useMemo(() => pending.filter((row) => !isRejected(row)), [pending]);

  const totals = useMemo(() => {
    return openRuns.reduce(
      (acc, row) => {
        acc.delivered += money(row.total_delivered_value);
        acc.collected += money(row.total_collection_value);
        acc.variance += money(row.variance_amount);
        return acc;
      },
      { delivered: 0, collected: 0, variance: 0 },
    );
  }, [openRuns]);

  const columns: DataTableColumn<ReconciliationRun>[] = [
    {
      key: "reconciliation_no",
      label: "Reconciliation No",
      render: (val) => (
        <span className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">{String(val || "—")}</span>
      ),
    },
    {
      key: "loading_number",
      label: "Loading #",
      className: "font-mono text-[13px]",
      render: (val) => String(val || "—"),
    },
    {
      key: "created_at",
      label: "Date",
      className: "whitespace-nowrap",
      render: (val) => (val ? format(new Date(String(val)), "MMM dd, yyyy") : "—"),
    },
    {
      key: "total_delivered_value",
      label: "Delivered",
      align: "right",
      className: "tabular-nums",
      render: (val) => formatMoney(money(val)),
    },
    {
      key: "total_collection_value",
      label: "Collected",
      align: "right",
      className: "tabular-nums font-medium text-[#15803D]",
      render: (val) => formatMoney(money(val)),
    },
    {
      key: "variance_amount",
      label: "Variance",
      align: "right",
      className: "tabular-nums",
      render: (val) => {
        const amount = money(val);
        const mismatched = Math.abs(amount) > 0.01;
        return (
          <span className={mismatched ? "font-semibold text-[#B91C1C]" : "font-medium text-[#15803D]"}>
            {formatMoney(amount)}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (_val, row) => {
        const status = statusValue(row);
        const className =
          status === "REJECTED"
            ? "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]"
            : status === "PENDING_VERIFICATION"
              ? "bg-[#F3E8FF] text-[#7C3AED] dark:bg-[#2E1064] dark:text-[#C4B5FD]"
              : status === "PENDING_APPROVAL"
                ? "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]"
                : "bg-[#FFFBEB] text-[#B45309] dark:bg-[#3B2A0A] dark:text-[#FBBF24]";
        return (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", className)}>
            {status === "REJECTED" ? <XCircle className="h-3 w-3" aria-hidden /> : null}
            {statusLabel(status)}
          </span>
        );
      },
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      headerClassName: "text-right",
      render: (_val, row) =>
        isRejected(row) ? null : (
        <div className="flex justify-end gap-0.5">
          <ActionIconButton
            label="Approve reconciliation"
            disabled={decisionBusy}
            onClick={() => setDecision({ type: "approve", run: row })}
            className="text-[#0C4DA1] hover:bg-[#EAF2FC] hover:text-[#0A3F86]"
          >
            {approveMutation.isPending && decision?.run.id === row.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </ActionIconButton>
          <ActionIconButton
            label="Reject reconciliation"
            disabled={decisionBusy}
            onClick={() => {
              setRejectReason("");
              setDecision({ type: "reject", run: row });
            }}
            className="text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
          >
            {rejectMutation.isPending && decision?.run.id === row.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
          </ActionIconButton>
        </div>
        ),
    },
  ];

  const motionProps = {
    initial: reduceMotion ? false : { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: reduceMotion ? 0 : 0.18 },
  };

  const submitCreate = () => {
    const value = loadingNumber.trim();
    if (!value || createMutation.isPending) return;
    createMutation.mutate(value);
  };

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden">
        <motion.div {...motionProps} className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Pending runs" value={openRuns.length} icon={GitCompare} accent="blue" />
          <KpiCard title="Delivered" value={formatMoney(totals.delivered)} icon={Scale} accent="blue" />
          <KpiCard title="Collected" value={formatMoney(totals.collected)} icon={FileText} accent="green" />
          <KpiCard title="Variance" value={formatMoney(totals.variance)} icon={ShieldAlert} accent="purple" />
        </motion.div>

        <motion.div {...motionProps} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Pending Reconciliations"
            description="Finance reconciliation from assignment loading numbers."
            toolbarIcon={<Scale className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search by number...",
            }}
            toolbarFilters={
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={cn("h-9 w-[220px]", fieldClass)} aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectPanelClass}>
                  <SelectItem value="all" className={selectItemClass}>
                    <StatusFilterOption icon={ListFilter} label="All Status" tone="navy" />
                  </SelectItem>
                  <SelectItem value="DRAFT" className={selectItemClass}>
                    <StatusFilterOption icon={Clock} label="Draft" tone="amber" />
                  </SelectItem>
                  <SelectItem value="PENDING_VERIFICATION" className={selectItemClass}>
                    <StatusFilterOption icon={ShieldAlert} label="Pending verification" tone="purple" />
                  </SelectItem>
                  <SelectItem value="PENDING_APPROVAL" className={selectItemClass}>
                    <StatusFilterOption icon={CheckCircle2} label="Pending approval" tone="green" />
                  </SelectItem>
                  <SelectItem value="REJECTED" className={selectItemClass}>
                    <StatusFilterOption icon={XCircle} label="Rejected" tone="red" />
                  </SelectItem>
                </SelectContent>
              </Select>
            }
            toolbarActions={
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ntSecondary" className="!h-8" onClick={() => refetch()} disabled={isFetching}>
                  {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Refresh
                </Button>
                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="ntPrimary" className="!h-8">
                      <Plus className="h-3.5 w-3.5" />
                      New Reconciliation
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className={cn(
                      NAVY_TEAL_SCOPE_CLASS,
                      "flex w-[calc(100%-1.5rem)] max-w-[420px] flex-col gap-0 overflow-hidden rounded-[20px] border border-[#E3EAF3] bg-white p-0 shadow-[0_24px_48px_rgba(15,23,42,0.16)] dark:border-[#2C3B50] dark:bg-[#151F30]",
                    )}
                  >
                    <DialogHeader className="shrink-0 space-y-0.5 border-b border-[#E3EAF3] px-4 py-3 text-left dark:border-[#2C3B50]">
                      <div className="flex items-start gap-3 pr-6">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                          <Scale className="h-4 w-4" />
                        </span>
                        <div>
                          <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                            Create Reconciliation
                          </DialogTitle>
                          <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                            Build a run from an assignment loading number.
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    <form
                      className="flex min-h-0 flex-1 flex-col"
                      onSubmit={(event) => {
                        event.preventDefault();
                        submitCreate();
                      }}
                    >
                      <div className="space-y-3 px-4 py-3">
                        <div className={fieldWrapClass}>
                          <Label className={labelClass} htmlFor="loading-number">
                            Loading number {requiredMark}
                          </Label>
                          <Input
                            id="loading-number"
                            value={loadingNumber}
                            onChange={(event) => setLoadingNumber(event.target.value)}
                            placeholder="e.g. 20250615-0001"
                            className={fieldClass}
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter className="shrink-0 gap-2 border-t border-[#E3EAF3] px-4 py-2.5 dark:border-[#2C3B50]">
                        <Button type="button" variant="ntSecondary" onClick={() => setShowCreate(false)} disabled={createMutation.isPending}>
                          Cancel
                        </Button>
                        <Button type="submit" variant="ntPrimary" disabled={createMutation.isPending || !loadingNumber.trim()}>
                          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Create
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            }
            data={filtered}
            columns={columns}
            loading={isLoading}
            error={isError ? (error instanceof Error ? error.message : "Unable to load reconciliations") : undefined}
            getRowId={(row) => row.id}
            resetPageKey={`${statusFilter}|${searchTerm}|${filtered.length}`}
            emptyMessage="No pending reconciliations found"
          />
        </motion.div>
      </div>

      <DecisionDialog
        open={Boolean(decision)}
        variant={decision?.type || "approve"}
        run={decision?.run || null}
        reason={rejectReason}
        busy={decisionBusy}
        onReasonChange={setRejectReason}
        onOpenChange={(open) => {
          if (!open) {
            setDecision(null);
            setRejectReason("");
          }
        }}
        onConfirm={() => {
          if (!decision) return;
          if (decision.type === "reject") {
            const reason = rejectReason.trim();
            if (!reason) return;
            rejectMutation.mutate({ id: decision.run.id, reason });
            return;
          }
          approveMutation.mutate(decision.run.id);
        }}
      />
    </ThemeScope>
  );
}
