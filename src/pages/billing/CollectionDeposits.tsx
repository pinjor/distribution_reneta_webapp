import { useEffect, useRef, useState, type ReactNode, type WheelEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigation, type CaptionProps } from "react-day-picker";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Clock, ListFilter, Plus, RefreshCw, Loader2, FileText, CheckCircle2, Coins, XCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAVY_TEAL_SCOPE_CLASS } from "@/lib/navyTealTheme";
import { cn } from "@/lib/utils";

interface CollectionDeposit {
  id: number;
  deposit_number: string;
  deposit_date: string;
  collection_person_id: number;
  collection_person_name: string;
  deposit_method: "BRAC" | "bKash" | "Nagad";
  deposit_amount: number;
  transaction_number: string;
  attachment_url?: string;
  remaining_amount: number;
  total_collection_amount: number;
  notes?: string;
  approved: boolean;
  approved_by?: number;
  approved_at?: string;
  rejected?: boolean;
  rejected_at?: string;
  approver_name?: string;
  created_at: string;
  updated_at: string;
}

interface Employee {
  id: number;
  first_name: string;
  last_name?: string;
  employee_id: string;
}

const fieldClass =
  "h-10 rounded-lg border border-[#CBD5E1] bg-white text-[13px] shadow-none focus:ring-0 focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]";
const labelClass = "text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]";
const selectPanelClass = "nt-select-panel z-[200] rounded-xl border p-1 shadow-lg";
const selectItemClass = "cursor-pointer rounded-md py-2 pl-8 pr-3 text-[13px] leading-snug";
const fieldWrapClass = "min-w-0 space-y-1";
const sectionTitleClass = "mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]";
const requiredMark = <span className="text-[#DC2626]">*</span>;

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDisplayDate(value: string) {
  const date = parseISODate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const DATE_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDateYearBounds(now = new Date()) {
  const currentYear = now.getFullYear();
  return { fromYear: currentYear - 20, toYear: currentYear + 20 };
}

function DatePickerCaption({ displayMonth }: CaptionProps) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation();
  const [menu, setMenu] = useState<"month" | "year" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const year = displayMonth.getFullYear();
  const monthIndex = displayMonth.getMonth();
  const { fromYear, toYear } = getDateYearBounds();
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, index) => fromYear + index);

  useEffect(() => {
    if (!menu) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenu(null);
      }
    };
    document.addEventListener("pointerdown", closeOnOutside, true);
    return () => document.removeEventListener("pointerdown", closeOnOutside, true);
  }, [menu]);

  useEffect(() => {
    if (menu !== "year") return;
    const active = menuRef.current?.querySelector<HTMLElement>("[data-current-year='true']");
    active?.scrollIntoView({ block: "center" });
  }, [menu]);

  const goTo = (next: Date) => {
    goToMonth(next);
    setMenu(null);
  };

  return (
    <div className="relative mb-2 flex items-center justify-between px-1">
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center text-[#1E293B] hover:text-[#0C4DA1] disabled:opacity-30 dark:text-[#F1F5F9] dark:hover:text-[#70ADFF]"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="inline-flex items-center gap-0.5 border-0 bg-transparent px-1 text-sm font-semibold text-[#1E293B] hover:text-[#0C4DA1] dark:text-[#F1F5F9] dark:hover:text-[#70ADFF]"
          onClick={() => setMenu(menu === "month" ? null : "month")}
        >
          {DATE_MONTHS[monthIndex]}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 border-0 bg-transparent px-1 text-sm font-semibold text-[#1E293B] hover:text-[#0C4DA1] dark:text-[#F1F5F9] dark:hover:text-[#70ADFF]"
          onClick={() => setMenu(menu === "year" ? null : "year")}
        >
          {year}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      </div>
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center text-[#1E293B] hover:text-[#0C4DA1] disabled:opacity-30 dark:text-[#F1F5F9] dark:hover:text-[#70ADFF]"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {menu === "month" && (
        <div
          ref={menuRef}
          className="absolute left-1/2 top-9 z-20 grid w-[220px] -translate-x-1/2 grid-cols-2 gap-0.5 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-lg dark:border-[#2C3B50] dark:bg-[#151F30]"
        >
          {DATE_MONTHS.map((label, index) => (
            <button
              key={label}
              type="button"
              className={cn(
                "rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-[#EAF2FC] hover:text-[#0C4DA1] dark:hover:bg-[#1B304D] dark:hover:text-[#70ADFF]",
                index === monthIndex && "bg-[#EAF2FC] font-semibold text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
              )}
              onClick={() => goTo(new Date(year, index, 1))}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {menu === "year" && (
        <div
          ref={menuRef}
          className="nt-date-year-list absolute left-1/2 top-9 z-20 h-[168px] w-[4.75rem] -translate-x-1/2 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white py-1 pl-1 pr-0.5 shadow-lg dark:border-[#2C3B50] dark:bg-[#151F30]"
        >
          {years.map((item) => (
            <button
              key={item}
              type="button"
              data-current-year={item === year ? "true" : undefined}
              className={cn(
                "flex w-full items-center justify-center rounded-md px-2 py-1 text-[12px] hover:bg-[#EAF2FC] hover:text-[#0C4DA1] dark:hover:bg-[#1B304D] dark:hover:text-[#70ADFF]",
                item === year && "bg-[#0C4DA1] font-semibold text-white hover:bg-[#0C4DA1] hover:text-white dark:bg-[#70ADFF] dark:text-[#0B1220]",
              )}
              onClick={() => goTo(new Date(item, monthIndex, 1))}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DepositDateField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseISODate(value);
  const [month, setMonth] = useState<Date>(selected || new Date());
  const { fromYear, toYear } = getDateYearBounds();

  return (
    <div className="nt-date-field relative">
      <input
        tabIndex={-1}
        required
        value={value}
        onChange={() => undefined}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-hidden
      />
      <Popover
        modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next && selected) setMonth(selected);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between rounded-lg px-2.5 active:scale-100",
              fieldClass,
              !value && "text-[#94A3B8]",
            )}
          >
            <span className={cn("truncate", value && "text-[#172B4D] dark:text-[#F1F5F9]")}>
              {value ? formatDisplayDate(value) : "Select date"}
            </span>
            <CalendarIcon className="h-4 w-4 shrink-0 text-[#0C4DA1]" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          className="nt-date-popover z-[300] w-auto rounded-2xl border border-[#E2E8F0] bg-white p-0 shadow-lg dark:border-[#2C3B50] dark:bg-[#151F30]"
        >
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={(day) => {
              if (!day) return;
              onChange(toISODate(day));
              setMonth(day);
              setOpen(false);
            }}
            fromYear={fromYear}
            toYear={toYear}
            captionLayout="buttons"
            showOutsideDays
            className="p-3"
            components={{ Caption: DatePickerCaption }}
            classNames={{
              caption: "relative",
              nav: "hidden",
              cell: "h-9 w-9 p-0 text-center relative focus-within:relative [&:has([aria-selected])]:bg-transparent",
              head_cell: "w-9 font-medium text-[11px] text-[#94A3B8]",
              day: "h-8 w-8 rounded-full p-0 font-normal text-[13px] text-[#1E293B] hover:bg-[#EAF2FC] dark:text-[#F1F5F9] dark:hover:bg-[#1B304D]",
              day_today:
                "relative bg-transparent font-medium text-[#0C4DA1] after:absolute after:bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-[#0C4DA1] aria-selected:!bg-[#0C4DA1] aria-selected:!text-white aria-selected:after:bg-white dark:text-[#70ADFF] dark:after:bg-[#70ADFF]",
              day_selected:
                "!rounded-full !bg-[#0C4DA1] !text-white font-semibold hover:!bg-[#0C4DA1] hover:!text-white focus:!bg-[#0C4DA1] focus:!text-white dark:!bg-[#70ADFF] dark:!text-[#0B1220]",
              day_outside: "text-[#CBD5E1] opacity-100 aria-selected:!bg-[#0C4DA1] aria-selected:!text-white dark:text-[#64748B]",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function formatMoney(value: number) {
  return `৳${Number(value).toFixed(2)}`;
}

function StatusFilterOption({
  icon: Icon,
  label,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  tone: "navy" | "green" | "amber" | "red";
}) {
  const toneClass = {
    navy: "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
    green: "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]",
    amber: "bg-[#FFFBEB] text-[#B45309] dark:bg-[#3B2A0A] dark:text-[#FBBF24]",
    red: "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]",
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

function DepositInfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-[#64748B] dark:text-[#A9B8CC]">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]">{value}</p>
    </div>
  );
}

function DepositDecisionDialog({
  open,
  variant,
  deposit,
  busy,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  variant: "approve" | "reject";
  deposit: CollectionDeposit | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const isReject = variant === "reject";

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
                  {isReject ? "Reject this deposit?" : "Approve this deposit?"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-relaxed text-[#64748B] dark:text-[#A9B8CC]">
                  {isReject
                    ? "This deposit will stay in the list as Rejected. Approval will no longer be available."
                    : "Confirm the collection details below before approving."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {deposit ? (
          <div className="space-y-3 px-5 py-4">
            <div className="rounded-xl border border-[#E3EAF3] bg-[#F8FBFF] p-3 dark:border-[#2C3B50] dark:bg-[#1B283B]">
              <p className="font-mono text-sm font-semibold text-[#0C4DA1] dark:text-[#70ADFF]">{deposit.deposit_number}</p>
              <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#A9B8CC]">
                {deposit.collection_person_name || "—"} · {deposit.deposit_date ? format(new Date(deposit.deposit_date), "MMM dd, yyyy") : "—"}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <DepositInfoRow label="Method" value={deposit.deposit_method || "—"} />
                <DepositInfoRow label="Transaction" value={deposit.transaction_number || "—"} />
                <DepositInfoRow label="Total collection" value={formatMoney(Number(deposit.total_collection_amount))} />
                <DepositInfoRow label="Deposit amount" value={formatMoney(Number(deposit.deposit_amount))} />
                <DepositInfoRow label="Remaining cash" value={formatMoney(Number(deposit.remaining_amount))} />
                <DepositInfoRow label="Status" value="Pending" />
              </div>
              {deposit.notes ? (
                <div className="mt-3 border-t border-[#E3EAF3] pt-3 dark:border-[#2C3B50]">
                  <p className="text-[11px] text-[#64748B] dark:text-[#A9B8CC]">Notes</p>
                  <p className="mt-0.5 text-[13px] text-[#172B4D] dark:text-[#F1F5F9]">{deposit.notes}</p>
                </div>
              ) : null}
            </div>
            <div
              className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
                isReject
                  ? "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]"
                  : "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
              )}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {isReject
                  ? "Rejected deposits remain in history and can be found with the Rejected status filter."
                  : "Approval records the reviewer and timestamp. The deposit can no longer be edited."}
              </span>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 border-t border-[#E3EAF3] bg-[#F8FAFC] px-5 py-3 dark:border-[#2C3B50] dark:bg-[#1B283B] sm:space-x-0">
          <Button
            type="button"
            variant="ntSecondary"
            disabled={busy}
            className="!h-9"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cn(
              "!h-9 rounded-lg border-0 text-white shadow-none",
              isReject ? "bg-[#DC2626] hover:bg-[#B91C1C]" : "bg-[#0C4DA1] hover:bg-[#0A3F86]",
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isReject ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {busy ? (isReject ? "Rejecting..." : "Approving...") : isReject ? "Reject deposit" : "Approve deposit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function preventNumberWheel(event: WheelEvent<HTMLInputElement>) {
  event.currentTarget.blur();
}

function generateRemainingCashReceiptPDF(
  deposit: CollectionDeposit,
  receivedAmount: string,
  receiptNotes: string,
) {
  const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cash Receipt - ${deposit.deposit_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
          .section { margin: 20px 0; }
          .row { display: flex; justify-content: space-between; margin: 10px 0; }
          .label { font-weight: bold; }
          .footer { margin-top: 40px; border-top: 2px solid #000; padding-top: 20px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Remaining Cash Receipt</h1>
          <p>Collection Deposit Receipt</p>
        </div>
        <div class="section">
          <h2>Deposit Information</h2>
          <div class="row">
            <span class="label">Deposit Number:</span>
            <span>${deposit.deposit_number}</span>
          </div>
          <div class="row">
            <span class="label">Date:</span>
            <span>${format(new Date(deposit.deposit_date), "MMMM dd, yyyy")}</span>
          </div>
          <div class="row">
            <span class="label">Collection Person:</span>
            <span>${deposit.collection_person_name}</span>
          </div>
        </div>
        <div class="section">
          <h2>Cash Receipt Details</h2>
          <table>
            <tr>
              <th>Description</th>
              <th>Amount (BDT)</th>
            </tr>
            <tr>
              <td>Total Collection Amount</td>
              <td>৳${Number(deposit.total_collection_amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Initial Deposit Amount</td>
              <td>৳${Number(deposit.deposit_amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td><strong>Remaining Cash Received</strong></td>
              <td><strong>৳${receivedAmount}</strong></td>
            </tr>
            <tr>
              <td>Remaining Balance</td>
              <td>৳${Number(deposit.remaining_amount - parseFloat(receivedAmount)).toFixed(2)}</td>
            </tr>
          </table>
        </div>
        <div class="section">
          <h2>Receipt Information</h2>
          <div class="row">
            <span class="label">Received Date:</span>
            <span>${format(new Date(), "MMMM dd, yyyy 'at' hh:mm a")}</span>
          </div>
          ${receiptNotes ? `<div class="row"><span class="label">Notes:</span><span>${receiptNotes}</span></div>` : ""}
        </div>
        <div class="footer">
          <p><strong>This is a system-generated receipt for remaining cash deposit.</strong></p>
          <p>Please keep this receipt for your records.</p>
          <p>Generated on: ${format(new Date(), "MMMM dd, yyyy 'at' hh:mm a")}</p>
        </div>
      </body>
      </html>
    `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

function ReceiveRemainingCashDialog({
  open,
  onOpenChange,
  employees,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[] | undefined;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [depositId, setDepositId] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const currentUserId = 1;

  const { data: deposits, refetch: refetchDeposits } = useQuery({
    queryKey: ["billing-deposits-person", selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return [];
      const result = await apiEndpoints.billing.deposits.getAll({
        collection_person_id: parseInt(selectedPersonId),
      });
      return Array.isArray(result) ? result : [];
    },
    enabled: open && !!selectedPersonId,
  });

  const today = new Date().toISOString().split("T")[0];
  const availableDeposits = (deposits || []).filter((dep: CollectionDeposit) => {
    const depositDate = new Date(dep.deposit_date).toISOString().split("T")[0];
    return depositDate === today && dep.remaining_amount > 0 && !dep.rejected;
  });
  const selectedDeposit = availableDeposits.find((dep: CollectionDeposit) => dep.id.toString() === depositId);
  const receivedValue = parseFloat(receivedAmount || "0");
  const newBalance = selectedDeposit
    ? selectedDeposit.remaining_amount - (Number.isNaN(receivedValue) ? 0 : receivedValue)
    : 0;

  useEffect(() => {
    if (selectedDeposit) {
      setReceivedAmount(selectedDeposit.remaining_amount.toString());
    }
  }, [selectedDeposit]);

  const resetRemainingForm = () => {
    setSelectedPersonId("");
    setDepositId("");
    setReceivedAmount("");
    setReceiptNotes("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && processing) return;
    if (!next) resetRemainingForm();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processing) return;

    if (!selectedPersonId || !depositId || !receivedAmount) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(receivedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (selectedDeposit && amount > selectedDeposit.remaining_amount) {
      toast({
        title: "Amount Exceeded",
        description: `Cannot receive more than remaining amount (৳${selectedDeposit.remaining_amount})`,
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      const result = await apiEndpoints.billing.deposits.receiveRemaining(
        parseInt(depositId),
        amount,
        currentUserId,
        receiptNotes,
      );

      toast({
        title: "Cash Received Successfully",
        description: `Remaining cash of ৳${amount} has been documented`,
      });

      await generateRemainingCashReceiptPDF(result, receivedAmount, receiptNotes);

      resetRemainingForm();
      refetchDeposits();
      onSuccess();
      onOpenChange(false);

      toast({
        title: "Receipt Generated",
        description: "PDF receipt has been generated and can be printed",
      });
    } catch (error: any) {
      console.error("Failed to receive cash", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process cash receipt",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const dialogClass = cn(
    NAVY_TEAL_SCOPE_CLASS,
    "flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[720px] flex-col gap-0 overflow-hidden rounded-[20px] border border-[#E3EAF3] bg-white p-0 shadow-[0_24px_48px_rgba(15,23,42,0.16)] dark:border-[#2C3B50] dark:bg-[#151F30]",
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={dialogClass}>
        <DialogHeader className="shrink-0 space-y-0.5 border-b border-[#E3EAF3] px-5 py-3 text-left dark:border-[#2C3B50]">
          <div className="flex items-start gap-3 pr-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
              <Coins className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                Receive Remaining Cash
              </DialogTitle>
              <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                Document remaining cash from employees
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
            <section>
              <h3 className={sectionTitleClass}>Collection details</h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className={fieldWrapClass}>
                  <Label htmlFor="remaining-collection-person" className={labelClass}>
                    Collection Person {requiredMark}
                  </Label>
                  <Select
                    value={selectedPersonId}
                    onValueChange={(value) => {
                      setSelectedPersonId(value);
                      setDepositId("");
                      setReceivedAmount("");
                    }}
                    required
                  >
                    <SelectTrigger id="remaining-collection-person" className={cn("w-full", fieldClass)}>
                      <SelectValue placeholder="Select collection person" />
                    </SelectTrigger>
                    <SelectContent className={selectPanelClass}>
                      {(employees || []).map((emp: Employee) => (
                        <SelectItem key={emp.id} value={emp.id.toString()} className={selectItemClass}>
                          {emp.first_name} {emp.last_name || ""} ({emp.employee_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={fieldWrapClass}>
                  <Label htmlFor="remaining-deposit" className={labelClass}>
                    Today&apos;s Deposit {requiredMark}
                  </Label>
                  <Select
                    value={depositId}
                    onValueChange={setDepositId}
                    disabled={!selectedPersonId || availableDeposits.length === 0}
                    required
                  >
                    <SelectTrigger id="remaining-deposit" className={cn("w-full", fieldClass)}>
                      <SelectValue placeholder="Select deposit" />
                    </SelectTrigger>
                    <SelectContent className={selectPanelClass}>
                      {availableDeposits.map((dep: CollectionDeposit) => (
                        <SelectItem key={dep.id} value={dep.id.toString()} className={selectItemClass}>
                          {dep.deposit_number} - Remaining: {formatMoney(dep.remaining_amount)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPersonId && availableDeposits.length === 0 ? (
                    <p className="text-[12px] text-[#64748B] dark:text-[#A9B8CC]">
                      No remaining cash for this person today
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            {selectedDeposit ? (
              <section className="mt-3 border-t border-[#E3EAF3] pt-3 dark:border-[#2C3B50]">
                <h3 className={cn(sectionTitleClass, "flex items-center gap-2")}>
                  <FileText className="h-4 w-4 text-[#0C4DA1]" aria-hidden />
                  Deposit details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[12px] text-[#64748B] dark:text-[#A9B8CC]">Deposit Number</p>
                    <p className="mt-0.5 font-medium text-[#0C4DA1] dark:text-[#70ADFF]">{selectedDeposit.deposit_number}</p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#64748B] dark:text-[#A9B8CC]">Date</p>
                    <p className="mt-0.5 font-medium text-[#172B4D] dark:text-[#F1F5F9]">
                      {format(new Date(selectedDeposit.deposit_date), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#64748B] dark:text-[#A9B8CC]">Total Collection</p>
                    <p className="mt-0.5 font-medium tabular-nums text-[#172B4D] dark:text-[#F1F5F9]">
                      {formatMoney(selectedDeposit.total_collection_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#64748B] dark:text-[#A9B8CC]">Remaining Amount</p>
                    <p className="mt-0.5 font-semibold tabular-nums text-[#B45309] dark:text-[#FBBF24]">
                      {formatMoney(selectedDeposit.remaining_amount)}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="mt-3 border-t border-[#E3EAF3] pt-3 dark:border-[#2C3B50]">
              <h3 className={sectionTitleClass}>Cash receipt details</h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className={fieldWrapClass}>
                  <Label htmlFor="received-amount" className={labelClass}>
                    Received Amount (BDT) {requiredMark}
                  </Label>
                  <Input
                    id="received-amount"
                    type="number"
                    step="0.01"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    disabled={!selectedDeposit}
                    className={fieldClass}
                    onWheel={preventNumberWheel}
                  />
                  {selectedDeposit ? (
                    <p className="text-[12px] text-[#64748B] dark:text-[#A9B8CC]">
                      Maximum: {formatMoney(selectedDeposit.remaining_amount)}
                    </p>
                  ) : null}
                </div>
                <div className={fieldWrapClass}>
                  <Label htmlFor="receipt-date" className={labelClass}>
                    Receipt Date
                  </Label>
                  <Input
                    id="receipt-date"
                    type="text"
                    value={format(new Date(), "MMMM dd, yyyy 'at' hh:mm a")}
                    disabled
                    className={cn(fieldClass, "bg-[#F8FAFC] text-[#64748B] dark:bg-[#1B283B] dark:text-[#A9B8CC]")}
                  />
                </div>
              </div>
              <div className={cn(fieldWrapClass, "mt-2.5")}>
                <Label htmlFor="receipt-notes" className={labelClass}>
                  Receipt Notes (Optional)
                </Label>
                <Textarea
                  id="receipt-notes"
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="Additional notes for this cash receipt..."
                  rows={3}
                  className="min-h-[72px] rounded-lg border border-[#CBD5E1] text-[13px] shadow-none focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]"
                />
              </div>
            </section>

            {selectedDeposit && receivedAmount ? (
              <section className="mt-3 border-t border-[#E3EAF3] pt-3 dark:border-[#2C3B50]">
                <h3 className={cn(sectionTitleClass, "flex items-center gap-2")}>
                  <CheckCircle2 className="h-4 w-4 text-[#0C4DA1]" aria-hidden />
                  Receipt summary
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[12px] text-[#64748B] dark:text-[#A9B8CC]">Cash Received</p>
                    <p className="mt-0.5 font-semibold tabular-nums text-[#0C4DA1] dark:text-[#70ADFF]">
                      {formatMoney(Number.isNaN(receivedValue) ? 0 : receivedValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#64748B] dark:text-[#A9B8CC]">New Remaining Balance</p>
                    <p className="mt-0.5 font-medium tabular-nums text-[#172B4D] dark:text-[#F1F5F9]">
                      {formatMoney(newBalance)}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-[#E3EAF3] px-5 py-3 dark:border-[#2C3B50]">
            <Button type="button" variant="ntSecondary" onClick={() => handleOpenChange(false)} disabled={processing}>
              Cancel
            </Button>
            <Button type="submit" variant="ntPrimary" disabled={processing || !selectedDeposit || !receivedAmount}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
              Receive Cash & Generate Receipt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ActionIconButton({
  label,
  onClick,
  className,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
          className={cn("h-8 w-8 rounded-md p-0", className)}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export default function CollectionDeposits() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    document.title = "Collection Deposits | Renata";
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemainingDialog, setShowRemainingDialog] = useState(false);

  useEffect(() => {
    if (searchParams.get("receive") !== "1") return;
    setShowRemainingDialog(true);
    const next = new URLSearchParams(searchParams);
    next.delete("receive");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const [approvedFilter, setApprovedFilter] = useState<string>("all");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [decision, setDecision] = useState<{ type: "approve" | "reject"; deposit: CollectionDeposit } | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [depositForm, setDepositForm] = useState({
    deposit_date: new Date().toISOString().split("T")[0],
    collection_person_id: "",
    deposit_method: "BRAC" as "BRAC" | "bKash" | "Nagad",
    deposit_amount: "",
    transaction_number: "",
    attachment_url: "",
    remaining_amount: "",
    total_collection_amount: "",
    notes: "",
  });

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiEndpoints.employees.getAll(),
  });

  const { data: depositsData, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["billing-deposits", approvedFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (approvedFilter === "approved") {
        params.approved = true;
      } else if (approvedFilter === "pending") {
        params.approved = false;
        params.rejected = false;
      } else if (approvedFilter === "rejected") {
        params.rejected = true;
      }
      const result = await apiEndpoints.billing.deposits.getAll(params);
      return Array.isArray(result) ? result : [];
    },
  });

  const deposits = depositsData || [];

  const filteredDeposits = deposits.filter((deposit: CollectionDeposit) => {
    const term = searchTerm.toLowerCase();
    return (
      deposit.deposit_number.toLowerCase().includes(term) ||
      deposit.collection_person_name.toLowerCase().includes(term) ||
      deposit.transaction_number.toLowerCase().includes(term)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    try {
      setCreating(true);
      const depositData = {
        ...depositForm,
        collection_person_id: parseInt(depositForm.collection_person_id),
        deposit_amount: parseFloat(depositForm.deposit_amount),
        remaining_amount: parseFloat(depositForm.remaining_amount) || 0,
        total_collection_amount: parseFloat(depositForm.total_collection_amount),
      };

      await apiEndpoints.billing.deposits.create(depositData);
      toast({
        title: "Deposit created",
        description: "Collection deposit has been created successfully",
      });
      setShowAddDialog(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["billing-deposits"] });
      refetch();
    } catch (submitError: any) {
      console.error("Failed to create deposit", submitError);
      toast({
        title: "Error",
        description: submitError.message || "Failed to create deposit",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (deposit: CollectionDeposit) => {
    if (decisionBusy) return;
    try {
      setDecisionBusy(true);
      setApprovingId(deposit.id);
      const userId = 1;
      await apiEndpoints.billing.deposits.approve(deposit.id, userId);
      toast({
        title: "Deposit approved",
        description: `${deposit.deposit_number} has been approved successfully`,
      });
      setDecision(null);
      queryClient.invalidateQueries({ queryKey: ["billing-deposits"] });
      refetch();
    } catch (approveError: any) {
      console.error("Failed to approve deposit", approveError);
      toast({
        title: "Error",
        description: approveError.message || "Failed to approve deposit",
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
      setDecisionBusy(false);
    }
  };

  const handleReject = async (deposit: CollectionDeposit) => {
    if (decisionBusy) return;
    try {
      setDecisionBusy(true);
      await apiEndpoints.billing.deposits.reject(deposit.id);
      toast({
        title: "Deposit rejected",
        description: `${deposit.deposit_number} has been rejected`,
      });
      setDecision(null);
      queryClient.invalidateQueries({ queryKey: ["billing-deposits"] });
      refetch();
    } catch (rejectError: any) {
      console.error("Failed to reject deposit", rejectError);
      toast({
        title: "Error",
        description: rejectError.message || "Failed to reject deposit",
        variant: "destructive",
      });
    } finally {
      setDecisionBusy(false);
    }
  };

  const resetForm = () => {
    setDepositForm({
      deposit_date: new Date().toISOString().split("T")[0],
      collection_person_id: "",
      deposit_method: "BRAC",
      deposit_amount: "",
      transaction_number: "",
      attachment_url: "",
      remaining_amount: "",
      total_collection_amount: "",
      notes: "",
    });
  };

  const columns: DataTableColumn<CollectionDeposit>[] = [
    {
      key: "deposit_number",
      label: "Deposit Number",
      render: (val) => (
        <span className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">{String(val || "—")}</span>
      ),
    },
    {
      key: "deposit_date",
      label: "Date",
      className: "whitespace-nowrap",
      render: (val) => (val ? format(new Date(String(val)), "MMM dd, yyyy") : "—"),
    },
    {
      key: "collection_person_name",
      label: "Collection Person",
    },
    {
      key: "deposit_method",
      label: "Method",
      render: (val) => (
        <span className="inline-flex rounded-full border border-[#E3EAF3] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-semibold text-[#0C4DA1] dark:border-[#2C3B50] dark:bg-[#1B304D] dark:text-[#70ADFF]">
          {String(val || "—")}
        </span>
      ),
    },
    {
      key: "transaction_number",
      label: "Transaction Number",
      className: "font-mono text-[13px]",
    },
    {
      key: "total_collection_amount",
      label: "Total Collection",
      align: "right",
      className: "tabular-nums font-medium",
      render: (val) => formatMoney(Number(val)),
    },
    {
      key: "deposit_amount",
      label: "Deposit Amount",
      align: "right",
      className: "tabular-nums font-medium",
      render: (val) => formatMoney(Number(val)),
    },
    {
      key: "remaining_amount",
      label: "Remaining",
      align: "right",
      className: "tabular-nums",
      render: (val) => formatMoney(Number(val)),
    },
    {
      key: "approved",
      label: "Status",
      render: (_val, row) =>
        row.rejected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]">
            <XCircle className="h-3 w-3" aria-hidden />
            Rejected
          </span>
        ) : row.approved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Approved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-semibold text-[#B45309] dark:bg-[#3B2A0A] dark:text-[#FBBF24]">
            Pending
          </span>
        ),
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      headerClassName: "text-right",
      render: (_val, row) =>
        row.approved || row.rejected ? null : (
          <div className="flex justify-end gap-0.5">
            <ActionIconButton
              label="Approve deposit"
              disabled={decisionBusy}
              onClick={() => setDecision({ type: "approve", deposit: row })}
              className="text-[#0C4DA1] hover:bg-[#EAF2FC] hover:text-[#0A3F86]"
            >
              {approvingId === row.id && decisionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            </ActionIconButton>
            <ActionIconButton
              label="Reject deposit"
              disabled={decisionBusy}
              onClick={() => setDecision({ type: "reject", deposit: row })}
              className="text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
            >
              <XCircle className="h-4 w-4" />
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

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <motion.div {...motionProps} className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
        <DataTable
          className="min-h-0 min-w-0 flex-1 overflow-hidden"
          title="Deposit List"
          description="Manage daily collection deposits from your collection team."
          toolbarIcon={<FileText className="h-4 w-4" />}
          search={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: "Search deposits",
          }}
          toolbarFilters={
            <Select value={approvedFilter} onValueChange={setApprovedFilter}>
              <SelectTrigger className={cn("h-9 w-[180px]", fieldClass)} aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectPanelClass}>
                <SelectItem value="all" className={selectItemClass}>
                  <StatusFilterOption icon={ListFilter} label="All Status" tone="navy" />
                </SelectItem>
                <SelectItem value="approved" className={selectItemClass}>
                  <StatusFilterOption icon={CheckCircle2} label="Approved" tone="green" />
                </SelectItem>
                <SelectItem value="pending" className={selectItemClass}>
                  <StatusFilterOption icon={Clock} label="Pending" tone="amber" />
                </SelectItem>
                <SelectItem value="rejected" className={selectItemClass}>
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
              <Button
                type="button"
                variant="ntSecondary"
                className="!h-8"
                onClick={() => setShowRemainingDialog(true)}
              >
                <Coins className="h-3.5 w-3.5" />
                Receive Remaining Cash
              </Button>
              <ReceiveRemainingCashDialog
                open={showRemainingDialog}
                onOpenChange={setShowRemainingDialog}
                employees={employees}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["billing-deposits"] });
                  refetch();
                }}
              />
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button type="button" variant="ntPrimary" className="!h-8">
                    <Plus className="h-3.5 w-3.5" />
                    New Deposit
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className={cn(
                    NAVY_TEAL_SCOPE_CLASS,
                    "flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[720px] flex-col gap-0 overflow-hidden rounded-[20px] border border-[#E3EAF3] bg-white p-0 shadow-[0_24px_48px_rgba(15,23,42,0.16)] dark:border-[#2C3B50] dark:bg-[#151F30]",
                  )}
                >
                  <DialogHeader className="shrink-0 space-y-0.5 border-b border-[#E3EAF3] px-5 py-3 text-left dark:border-[#2C3B50]">
                    <div className="flex items-start gap-3 pr-6">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                        <Coins className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                          Create Collection Deposit
                        </DialogTitle>
                        <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                          Record a daily collection deposit from your collection team
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
                      <section>
                        <h3 className={sectionTitleClass}>Deposit details</h3>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          <div className={fieldWrapClass}>
                            <Label className={labelClass} htmlFor="deposit-date">
                              Deposit Date {requiredMark}
                            </Label>
                            <DepositDateField
                              id="deposit-date"
                              value={depositForm.deposit_date}
                              onChange={(value) => setDepositForm({ ...depositForm, deposit_date: value })}
                            />
                          </div>
                          <div className={fieldWrapClass}>
                            <Label className={labelClass}>Collection Person {requiredMark}</Label>
                            <Select
                              value={depositForm.collection_person_id}
                              onValueChange={(value) => setDepositForm({ ...depositForm, collection_person_id: value })}
                              required
                            >
                              <SelectTrigger className={cn("w-full", fieldClass)}>
                                <SelectValue placeholder="Select collection person" />
                              </SelectTrigger>
                              <SelectContent className={selectPanelClass}>
                                {(employees || []).map((emp: Employee) => (
                                  <SelectItem key={emp.id} value={emp.id.toString()} className={selectItemClass}>
                                    {emp.first_name} {emp.last_name || ""} ({emp.employee_id})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className={fieldWrapClass}>
                            <Label className={labelClass}>Deposit Method {requiredMark}</Label>
                            <Select
                              value={depositForm.deposit_method}
                              onValueChange={(value: "BRAC" | "bKash" | "Nagad") =>
                                setDepositForm({ ...depositForm, deposit_method: value })
                              }
                              required
                            >
                              <SelectTrigger className={cn("w-full", fieldClass)}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className={selectPanelClass}>
                                <SelectItem value="BRAC" className={selectItemClass}>
                                  BRAC
                                </SelectItem>
                                <SelectItem value="bKash" className={selectItemClass}>
                                  bKash
                                </SelectItem>
                                <SelectItem value="Nagad" className={selectItemClass}>
                                  Nagad
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className={fieldWrapClass}>
                            <Label className={labelClass}>Transaction Number {requiredMark}</Label>
                            <Input
                              value={depositForm.transaction_number}
                              onChange={(e) => setDepositForm({ ...depositForm, transaction_number: e.target.value })}
                              placeholder="Enter transaction number"
                              required
                              className={fieldClass}
                            />
                          </div>
                        </div>
                      </section>

                      <section className="mt-3 border-t border-[#E3EAF3] pt-3 dark:border-[#2C3B50]">
                        <h3 className={sectionTitleClass}>Amounts</h3>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                          <div className={fieldWrapClass}>
                            <Label className={labelClass}>Total Collection {requiredMark}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={depositForm.total_collection_amount}
                              onChange={(e) => setDepositForm({ ...depositForm, total_collection_amount: e.target.value })}
                              placeholder="0.00"
                              required
                              className={fieldClass}
                            />
                          </div>
                          <div className={fieldWrapClass}>
                            <Label className={labelClass}>Deposit Amount {requiredMark}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={depositForm.deposit_amount}
                              onChange={(e) => setDepositForm({ ...depositForm, deposit_amount: e.target.value })}
                              placeholder="0.00"
                              required
                              className={fieldClass}
                            />
                          </div>
                          <div className={fieldWrapClass}>
                            <Label className={labelClass}>Remaining Amount</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={depositForm.remaining_amount}
                              onChange={(e) => setDepositForm({ ...depositForm, remaining_amount: e.target.value })}
                              placeholder="0.00"
                              className={fieldClass}
                            />
                          </div>
                        </div>
                      </section>

                      <section className="mt-3 border-t border-[#E3EAF3] pt-3 dark:border-[#2C3B50]">
                        <h3 className={sectionTitleClass}>Attachment and notes</h3>
                        <div className="grid grid-cols-1 gap-2.5">
                          <div className={fieldWrapClass}>
                            <Label className={labelClass}>Attachment URL</Label>
                            <Input
                              value={depositForm.attachment_url}
                              onChange={(e) => setDepositForm({ ...depositForm, attachment_url: e.target.value })}
                              placeholder="Enter attachment URL or path"
                              className={fieldClass}
                            />
                            <p className="text-[11px] text-[#64748B]">URL or path to the deposit receipt/attachment</p>
                          </div>
                          <div className={fieldWrapClass}>
                            <Label className={labelClass}>Notes</Label>
                            <Textarea
                              value={depositForm.notes}
                              onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
                              placeholder="Additional notes..."
                              rows={3}
                              className="min-h-[72px] rounded-lg border border-[#CBD5E1] text-[13px] shadow-none focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]"
                            />
                          </div>
                        </div>
                      </section>
                    </div>
                    <DialogFooter className="shrink-0 gap-2 border-t border-[#E3EAF3] px-5 py-3 dark:border-[#2C3B50]">
                      <Button type="button" variant="ntSecondary" onClick={() => setShowAddDialog(false)} disabled={creating}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="ntPrimary" disabled={creating}>
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Create Deposit
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          }
          data={filteredDeposits}
          columns={columns}
          loading={isLoading}
          error={isError ? (error instanceof Error ? error.message : "Unable to load deposits") : undefined}
          getRowId={(row) => row.id}
          resetPageKey={`${approvedFilter}|${searchTerm}|${filteredDeposits.length}`}
          emptyMessage="No deposits found"
        />
        <DepositDecisionDialog
          open={Boolean(decision)}
          variant={decision?.type || "approve"}
          deposit={decision?.deposit || null}
          busy={decisionBusy}
          onOpenChange={(open) => {
            if (!open) setDecision(null);
          }}
          onConfirm={() => {
            if (!decision) return;
            if (decision.type === "reject") {
              void handleReject(decision.deposit);
              return;
            }
            void handleApprove(decision.deposit);
          }}
        />
      </motion.div>
    </ThemeScope>
  );
}
