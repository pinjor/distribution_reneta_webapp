/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigation, type CaptionProps } from "react-day-picker";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { NAVY_TEAL_SCOPE_CLASS } from "@/lib/navyTealTheme";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AdjustmentRequest {
  id: string;
  voucherNo: string;
  voucherDate: string;
  store: string;
  status: "pending" | "submitted";
  adjustmentType?: string;
  reason?: string;
  items: any[];
}

type AdjustmentRequestRow = AdjustmentRequest & { sl: number };

const fieldClass =
  "h-10 rounded-lg border border-[#CBD5E1] bg-white text-[13px] font-normal text-[#172B4D] shadow-none transition-[border-color,box-shadow] duration-150 hover:bg-white hover:border-[#94A3B8] focus:ring-0 focus:ring-offset-0 focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 focus-visible:ring-offset-0 dark:border-[#2C3B50] dark:bg-[#151F30] dark:text-[#F1F5F9] dark:hover:bg-[#151F30]";
const labelClass = "text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]";
const selectPanelClass = "nt-select-panel z-[200] rounded-xl border p-1 shadow-lg";
const selectItemClass = "cursor-pointer rounded-md py-2 pl-8 pr-3 text-[13px] leading-snug";

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function formatFilterDate(date: Date) {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatApiDate(value: unknown) {
  const raw = String(value || "").slice(0, 10);
  const [year, month, day] = raw.split("-");
  if (year && month && day && year.length === 4) {
    return `${day}/${month}/${year}`;
  }
  return String(value || "—");
}

function normalizeStatus(status: unknown): "pending" | "submitted" {
  return String(status || "").trim().toLowerCase() === "pending" ? "pending" : "submitted";
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function printAdjustment(row: AdjustmentRequest) {
  const previous = document.getElementById("stock-adjustment-print-frame");
  previous?.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "stock-adjustment-print-frame";
  iframe.setAttribute("title", `Stock Adjustment ${row.voucherNo}`);
  iframe.style.cssText = "position:absolute;left:-9999px;top:0;width:210mm;height:297mm;border:0;";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    return;
  }

  const itemRows =
    row.items.length === 0
      ? `<tr><td colspan="4" class="center">No items</td></tr>`
      : row.items
          .map((item, index) => {
            const name = item.product?.name || item.product_name || item.product_id || "—";
            return `<tr>
              <td class="center">${index + 1}</td>
              <td>${escapeHtml(name)}</td>
              <td class="center">${escapeHtml(item.batch || "—")}</td>
              <td class="right">${escapeHtml(Number(item.quantity_change || 0))}</td>
            </tr>`;
          })
          .join("");

  frameDocument.open();
  frameDocument.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(row.voucherNo)}</title>
    <style>
      @page { size: A4 portrait; margin: 12mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 8px; }
      h1 { font-size: 20px; letter-spacing: .08em; text-align: center; margin: 0 0 4px; }
      .subtitle { text-align: center; text-transform: uppercase; font-size: 13px; margin: 0 0 16px; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; font-size: 13px; margin-bottom: 16px; }
      .meta p { margin: 3px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #111; padding: 6px 8px; }
      th { text-transform: uppercase; background: #f3f3f3; }
      .center { text-align: center; }
      .right { text-align: right; }
    </style>
  </head>
  <body>
    <h1>RENATA LIMITED</h1>
    <p class="subtitle">Stock Adjustment</p>
    <div class="meta">
      <div>
        <p><strong>Voucher No:</strong> ${escapeHtml(row.voucherNo)}</p>
        <p><strong>Voucher Date:</strong> ${escapeHtml(row.voucherDate)}</p>
        <p><strong>Store:</strong> ${escapeHtml(row.store)}</p>
      </div>
      <div>
        <p><strong>Status:</strong> ${escapeHtml(row.status === "submitted" ? "Approved" : "Pending")}</p>
        <p><strong>Type:</strong> ${escapeHtml(row.adjustmentType || "—")}</p>
        <p><strong>Reason:</strong> ${escapeHtml(row.reason || "—")}</p>
      </div>
    </div>
    <table>
      <thead>
        <tr><th>SL</th><th>Item</th><th>Batch</th><th>Qty Change</th></tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
  </body>
</html>`);
  frameDocument.close();

  window.setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
  }, 150);
}

function parseFilterDate(value: string) {
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) return undefined;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDisplayDate(value: string) {
  const date = parseFilterDate(value);
  if (!date) return value;
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

function FilterDateField({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseFilterDate(value);
  const [month, setMonth] = useState<Date>(selected || new Date());
  const { fromYear, toYear } = getDateYearBounds();

  return (
    <div className="nt-date-field relative">
      <Popover
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
            className={cn("w-full justify-between rounded-lg px-2.5 active:scale-100", fieldClass, !value && "text-[#94A3B8]")}
          >
            <span className={cn("truncate", value && "text-[#172B4D] dark:text-[#F1F5F9]")}>
              {value ? formatDisplayDate(value) : placeholder}
            </span>
            <CalendarIcon className="h-4 w-4 shrink-0 text-[#0C4DA1]" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="nt-date-popover z-[200] w-auto rounded-2xl border border-[#E2E8F0] bg-white p-0 shadow-lg dark:border-[#2C3B50] dark:bg-[#151F30]"
        >
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={(day) => {
              if (!day) return;
              onChange(formatFilterDate(day));
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

function adjustmentItemName(item: any) {
  return item.product?.name || item.product_name || item.item_name || (item.product_id ? `Product ${item.product_id}` : "—");
}

function AdjustmentConfirmDialog({
  open,
  variant,
  row,
  busy,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  variant: "delete" | "approve";
  row: AdjustmentRequest | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const isDelete = variant === "delete";
  const items = row?.items || [];
  const netQty = items.reduce((sum, item) => sum + Number(item.quantity_change || 0), 0);
  const previewItems = items.slice(0, 4);
  const extraCount = Math.max(0, items.length - previewItems.length);

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent
        className={cn(
          NAVY_TEAL_SCOPE_CLASS,
          "max-w-[440px] gap-0 overflow-hidden rounded-2xl border border-[#E3EAF3] p-0 shadow-[0_24px_48px_rgba(15,23,42,0.16)] dark:border-[#2C3B50] dark:bg-[#151F30]",
        )}
      >
        <div className={cn("px-5 pb-4 pt-5", isDelete ? "bg-[#FEF2F2] dark:bg-[#3B1212]/40" : "bg-[#ECFDF5] dark:bg-[#052E1C]/40")}>
          <AlertDialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  isDelete
                    ? "bg-white text-[#DC2626] shadow-sm dark:bg-[#151F30]"
                    : "bg-white text-[#16A34A] shadow-sm dark:bg-[#151F30]",
                )}
              >
                {isDelete ? <Trash2 className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <AlertDialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {isDelete ? "Delete this adjustment?" : "Approve this adjustment?"}
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1 text-sm leading-relaxed text-[#64748B] dark:text-[#A9B8CC]">
                  {isDelete
                    ? "This action cannot be undone. The voucher will be removed from the work list."
                    : "Quantity changes will be applied to live stock. This cannot be reversed from here."}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
        </div>

        {row ? (
          <div className="space-y-3 bg-white px-5 py-4 dark:bg-[#151F30]">
            <div className="rounded-xl border border-[#E3EAF3] bg-[#F8FBFF] p-3 dark:border-[#2C3B50] dark:bg-[#1B283B]">
              <p className="font-mono text-sm font-semibold text-[#0C4DA1] dark:text-[#70ADFF]">{row.voucherNo}</p>
              <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#A9B8CC]">
                {row.store} · {row.voucherDate}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[#94A3B8]">Type</p>
                  <p className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{row.adjustmentType || "—"}</p>
                </div>
                <div>
                  <p className="text-[#94A3B8]">Net qty</p>
                  <p className={cn("font-semibold tabular-nums", netQty < 0 ? "text-[#DC2626]" : "text-[#16A34A]")}>
                    {netQty > 0 ? `+${netQty}` : netQty}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[#94A3B8]">Reason</p>
                  <p className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{row.reason || "—"}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                {items.length} item{items.length === 1 ? "" : "s"}
              </p>
              <div className="overflow-hidden rounded-xl border border-[#E3EAF3] dark:border-[#2C3B50]">
                {previewItems.length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-[#94A3B8]">No line items on this voucher.</p>
                ) : (
                  previewItems.map((item, index) => (
                    <div
                      key={`${item.id || index}`}
                      className="flex items-center justify-between gap-3 border-b border-[#E3EAF3] px-3 py-2 last:border-b-0 dark:border-[#2C3B50]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]">
                          {adjustmentItemName(item)}
                        </p>
                        <p className="text-[11px] text-[#94A3B8]">Batch {item.batch || "—"}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-[13px] font-semibold tabular-nums",
                          Number(item.quantity_change || 0) < 0 ? "text-[#DC2626]" : "text-[#16A34A]",
                        )}
                      >
                        {Number(item.quantity_change || 0) > 0 ? "+" : ""}
                        {Number(item.quantity_change || 0)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              {extraCount > 0 ? (
                <p className="mt-1.5 text-[11px] text-[#64748B]">+{extraCount} more item{extraCount === 1 ? "" : "s"}</p>
              ) : null}
            </div>

            <div
              className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
                isDelete
                  ? "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]"
                  : "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]",
              )}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {isDelete
                  ? "Only pending adjustments can be deleted. Approved vouchers stay in history."
                  : "Approving posts these quantities to the stock ledger immediately."}
              </span>
            </div>
          </div>
        ) : null}

        <AlertDialogFooter className="gap-2 border-t border-[#E3EAF3] bg-[#F8FAFC] px-5 py-3 dark:border-[#2C3B50] dark:bg-[#1B283B] sm:space-x-0">
          <AlertDialogCancel
            disabled={busy}
            className="h-9 rounded-lg border border-[#E3EAF3] bg-white text-[#172B4D] shadow-none hover:bg-[#F8FAFC] dark:border-[#2C3B50] dark:bg-[#151F30] dark:text-[#F1F5F9]"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            className={cn(
              "h-9 rounded-lg border-0 text-white shadow-none",
              isDelete ? "bg-[#DC2626] hover:bg-[#B91C1C]" : "bg-[#16A34A] hover:bg-[#15803D]",
            )}
          >
            {busy ? <LoadingSpinner size="sm" /> : isDelete ? <Trash2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {busy ? (isDelete ? "Deleting..." : "Approving...") : isDelete ? "Delete voucher" : "Approve voucher"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ActionIconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
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

export default function AdjustmentRequest() {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStore, setSelectedStore] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdjustmentRequest | null>(null);
  const [approveTarget, setApproveTarget] = useState<AdjustmentRequest | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const { data: depotsResponse, isLoading: depotsLoading } = useQuery({
    queryKey: ["depots"],
    queryFn: apiEndpoints.depots.getAll,
  });

  const {
    data: adjustmentsResponse,
    isLoading: adjustmentsLoading,
    error: adjustmentsError,
  } = useQuery({
    queryKey: ["stock-adjustments"],
    queryFn: apiEndpoints.stockAdjustments.getAll,
  });

  const depots = depotsResponse?.data || depotsResponse || [];
  const depotNameById = useMemo(() => {
    const map = new Map<string, string>();
    (Array.isArray(depots) ? depots : []).forEach((depot: any) => {
      map.set(String(depot.id), depot.name || String(depot.id));
    });
    return map;
  }, [depots]);

  const adjustments = useMemo<AdjustmentRequest[]>(() => {
    const source = adjustmentsResponse?.data || adjustmentsResponse || [];
    if (!Array.isArray(source)) return [];
    return source.map((item: any) => ({
      id: String(item.id),
      voucherNo: item.adjustment_number || `ADJ-${item.id}`,
      voucherDate: formatApiDate(item.adjustment_date),
      store: item.depot?.name || depotNameById.get(String(item.depot_id)) || "—",
      status: normalizeStatus(item.status),
      adjustmentType: item.adjustment_type || "",
      reason: item.reason || "",
      items: Array.isArray(item.items) ? item.items : [],
    }));
  }, [adjustmentsResponse, depotNameById]);

  const filteredAdjustments = adjustments.filter((adj) => {
    const matchesStore = !selectedStore || adj.store.toLowerCase().includes(selectedStore.toLowerCase());
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "approved"
          ? adj.status === "submitted"
          : adj.status === "pending";
    const term = searchQuery.trim().toLowerCase();
    const statusLabel = adj.status === "submitted" ? "approved" : "pending";
    const matchesSearch =
      !term ||
      [adj.voucherNo, adj.voucherDate, adj.store, adj.status, statusLabel, adj.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    const matchesDate = true;

    return matchesStore && matchesStatus && matchesSearch && matchesDate;
  });

  const tableRows = useMemo<AdjustmentRequestRow[]>(
    () => filteredAdjustments.map((adj, index) => ({ ...adj, sl: index + 1 })),
    [filteredAdjustments],
  );

  const handleClear = () => {
    setSelectedStore("");
    setFromDate("");
    setToDate("");
    setSearchQuery("");
  };

  const handlePrint = (row: AdjustmentRequest) => {
    printAdjustment(row);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setActionBusy(true);
      await apiEndpoints.stockAdjustments.delete(Number(deleteTarget.id));
      toast({ title: "Adjustment deleted", description: `${deleteTarget.voucherNo} was removed.` });
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
    } catch (error: any) {
      toast({
        title: "Unable to delete",
        description: error?.message || "Failed to delete this adjustment.",
        variant: "destructive",
      });
    } finally {
      setActionBusy(false);
    }
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    try {
      setActionBusy(true);
      await apiEndpoints.stockAdjustments.approve(Number(approveTarget.id));
      toast({ title: "Adjustment approved", description: `${approveTarget.voucherNo} was approved.` });
      setApproveTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
    } catch (error: any) {
      toast({
        title: "Unable to approve",
        description: error?.message || "Failed to approve this adjustment.",
        variant: "destructive",
      });
    } finally {
      setActionBusy(false);
    }
  };

  const columns: DataTableColumn<AdjustmentRequestRow>[] = [
    { key: "sl", label: "SL", className: "w-16 tabular-nums text-[#64748B]" },
    {
      key: "voucherNo",
      label: "Voucher No.",
      render: (val) => <span className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">{String(val)}</span>,
    },
    {
      key: "voucherDate",
      label: "Voucher Date",
      className: "whitespace-nowrap tabular-nums text-[#475569]",
    },
    {
      key: "store",
      label: "Store",
      className: "max-w-[280px]",
      render: (val) => <span className="block truncate" title={String(val)}>{String(val)}</span>,
    },
    {
      key: "id",
      label: "Action",
      align: "right",
      headerClassName: "text-right",
      render: (_val, row) => (
        <div className="flex items-center justify-end gap-0.5">
          <ActionIconButton
            label="Print Adjustment"
            onClick={() => handlePrint(row)}
            className="text-[#0C4DA1] hover:bg-[#EAF2FC] hover:text-[#0C4DA1] dark:text-[#70ADFF] dark:hover:bg-[#1B304D]"
          >
            <Printer className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Delete Adjustment"
            onClick={() => setDeleteTarget(row)}
            className="text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626] dark:hover:bg-[#3B1212] dark:hover:text-[#FCA5A5]"
          >
            <Trash2 className="h-4 w-4" />
          </ActionIconButton>
          {row.status === "pending" ? (
            <ActionIconButton
              label="Approve Adjustment"
              onClick={() => setApproveTarget(row)}
              className="text-[#16A34A] hover:bg-[#ECFDF5] hover:text-[#15803D] dark:text-[#4ADE80] dark:hover:bg-[#052E1C]"
            >
              <CheckCircle2 className="h-4 w-4" />
            </ActionIconButton>
          ) : null}
        </div>
      ),
    },
  ];

  const sectionMotion = {
    initial: reduceMotion ? false : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.18 },
  };

  return (
    <ThemeScope className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 w-full flex-1 flex-col gap-5 overflow-hidden">
        <motion.div
          {...sectionMotion}
          className="nt-form shrink-0 rounded-2xl border border-[#E3EAF3] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#2C3B50] dark:bg-[#151F30]"
        >
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="store" className={labelClass}>
                Store
              </Label>
              <Select value={selectedStore} onValueChange={setSelectedStore} disabled={depotsLoading}>
                <SelectTrigger id="store" className={cn("w-full", fieldClass)}>
                  <SelectValue placeholder="Select Store" />
                </SelectTrigger>
                <SelectContent className={selectPanelClass}>
                  {depotsLoading ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                  ) : depots.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No stores available</div>
                  ) : (
                    depots.map((depot: any) => (
                      <SelectItem key={depot.id} value={depot.name} className={selectItemClass}>
                        <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#EAF2FC] text-[#0C4DA1]">
                          <Warehouse className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <span className="truncate">{depot.name}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1">
              <Label htmlFor="status" className={labelClass}>
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "all" | "pending" | "approved")}
              >
                <SelectTrigger id="status" className={cn("w-full", fieldClass)}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className={selectPanelClass}>
                  <SelectItem value="all" className={selectItemClass}>
                    All
                  </SelectItem>
                  <SelectItem value="pending" className={selectItemClass}>
                    Pending
                  </SelectItem>
                  <SelectItem value="approved" className={selectItemClass}>
                    Approved
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1">
              <Label htmlFor="fromDate" className={labelClass}>
                From Date
              </Label>
              <FilterDateField id="fromDate" value={fromDate} onChange={setFromDate} placeholder="DD/MM/YYYY" />
            </div>
            <div className="min-w-0 space-y-1">
              <Label htmlFor="toDate" className={labelClass}>
                To Date
              </Label>
              <FilterDateField id="toDate" value={toDate} onChange={setToDate} placeholder="DD/MM/YYYY" />
            </div>
            <div className="min-w-0 space-y-1">
              <Label htmlFor="recordSearch" className={labelClass}>
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden />
                <Input
                  id="recordSearch"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Voucher, store, date..."
                  className={cn("w-full !pl-9 !pr-8", fieldClass)}
                  aria-label="Search adjustment records"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#94A3B8] transition-colors duration-150 hover:text-[#172B4D] dark:hover:text-[#F1F5F9]"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="flex w-full items-end sm:col-span-2 xl:col-span-1 xl:w-auto">
              <Button type="button" variant="ntSecondary" onClick={handleClear} className="h-10 w-full xl:w-auto">
                <RotateCcw className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div {...sectionMotion} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 flex-1"
            title="Adjustment requests"
            description={
              statusFilter === "approved"
                ? "Approved adjustment vouchers matching the current filters."
                : statusFilter === "pending"
                  ? "Pending adjustment vouchers matching the current filters."
                  : "All adjustment vouchers matching the current filters."
            }
            toolbarIcon={<ClipboardList className="h-4 w-4" aria-hidden />}
            data={tableRows}
            columns={columns}
            loading={adjustmentsLoading}
            error={adjustmentsError ? "Unable to load adjustment requests." : undefined}
            getRowId={(row) => row.id}
            resetPageKey={`${selectedStore}|${fromDate}|${toDate}|${statusFilter}|${searchQuery}`}
            emptyMessage="No adjustment requests found."
          />
        </motion.div>
      </div>

      <AdjustmentConfirmDialog
        open={Boolean(deleteTarget)}
        variant="delete"
        row={deleteTarget}
        busy={actionBusy}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
      <AdjustmentConfirmDialog
        open={Boolean(approveTarget)}
        variant="approve"
        row={approveTarget}
        busy={actionBusy}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null);
        }}
        onConfirm={() => void confirmApprove()}
      />
    </ThemeScope>
  );
}
