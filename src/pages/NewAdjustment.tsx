/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState, type WheelEvent } from "react";
import { useNavigation, type CaptionProps } from "react-day-picker";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  Package,
  PackagePlus,
  Pencil,
  Pill,
  Plus,
  Trash2,
  Warehouse,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { NAVY_TEAL_SCOPE_CLASS } from "@/lib/navyTealTheme";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import { signedAdjustmentQuantity } from "@/lib/adjustmentDirection";

interface AdjustmentItem {
  id: number;
  itemCode: string;
  productId: number | null;
  packType: string;
  itemName: string;
  batchNo: string;
  currentStock: number;
  adjustType: string;
  correctionDirection: "" | "Increase" | "Decrease";
  adjustedQty: number;
  adjustReason: string;
  remarks: string;
}

interface AdjustedRecord {
  id: number;
  itemCode: string;
  productId: number | null;
  packType: string;
  itemName: string;
  unit: string;
  category: string;
  adjustedQty: number;
  adjustType: string;
  correctionDirection: "" | "Increase" | "Decrease";
  expireDate: string;
  batchNo: string;
}

type AdjustedRecordRow = AdjustedRecord & { sl: number };

const fieldClass =
  "h-8 rounded-md border border-[#CBD5E1] bg-white text-[13px] font-normal text-[#172B4D] shadow-none hover:bg-white hover:border-[#94A3B8] focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-[#2C3B50] dark:bg-[#151F30] dark:text-[#F1F5F9] dark:hover:bg-[#151F30]";
const labelClass = "text-[13px] font-medium text-nt-text";
const selectPanelClass = "nt-select-panel z-[200] rounded-xl border p-1 shadow-lg";
const selectItemClass = "cursor-pointer rounded-md py-2 pl-8 pr-3 text-[13px] leading-snug";
const fieldWrapClass = "min-w-0 space-y-1";

function SelectOptionIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}

function ItemCodeSelect({
  products,
  value,
  onSelect,
  disabled,
  loading,
}: {
  products: any[];
  value?: string;
  onSelect: (product: any) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = products.find((product) => String(product.id) === value);
  const selectedCode = selected
    ? selected.code || selected.new_code || selected.old_code || String(selected.id)
    : "";
  const selectedName = selected ? selected.name || selected.product_name || "" : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between rounded-md px-2.5 active:scale-100",
            fieldClass,
            !selected && "text-[#94A3B8]",
          )}
        >
          <span className="flex min-w-0 items-center">
            {selected ? (
              <>
                <SelectOptionIcon icon={Pill} />
                <span className="truncate text-nt-text">
                  {selectedCode}
                  {selectedName ? ` — ${selectedName}` : ""}
                </span>
              </>
            ) : loading ? (
              "Loading products..."
            ) : (
              "Select product"
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-nt-primary opacity-80" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="nt-select-panel z-[200] w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0"
      >
        <Command className="bg-transparent text-inherit">
          <CommandInput placeholder="" className="h-8" />
          <CommandList className="max-h-[260px] overscroll-contain py-1">
            <CommandEmpty className="py-4 text-xs text-[#64748B]">
              {loading ? "Loading..." : products.length === 0 ? "No products available" : "No products found."}
            </CommandEmpty>
            <CommandGroup className="p-0">
              {products.map((product) => {
                const code = product.code || product.new_code || product.old_code || String(product.id);
                const name = product.name || product.product_name || "";
                const id = String(product.id);
                return (
                  <CommandItem
                    key={id}
                    value={`${code} ${name} ${id}`}
                    onSelect={() => {
                      onSelect(product);
                      setOpen(false);
                    }}
                    className="cursor-pointer gap-2 rounded-md px-2 py-1.5"
                  >
                    <SelectOptionIcon icon={Pill} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium leading-tight">{name || code}</span>
                      <span className="mt-0.5 block truncate text-[11px] leading-tight text-[#64748B] dark:text-[#A9B8CC]">
                        {code}
                      </span>
                    </span>
                    {value === id ? <Check className="h-3.5 w-3.5 shrink-0 text-[#0C4DA1]" /> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function formatChalanDate(date: Date) {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function parseChalanDate(value: string) {
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) return undefined;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDisplayDate(value: string) {
  const date = parseChalanDate(value);
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

const DATE_YEAR_PAST = 20;
const DATE_YEAR_FUTURE = 20;

function getDateYearBounds(now = new Date()) {
  const currentYear = now.getFullYear();
  return {
    currentYear,
    fromYear: currentYear - DATE_YEAR_PAST,
    toYear: currentYear + DATE_YEAR_FUTURE,
  };
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

function ChalanDateField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseChalanDate(value);
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
            className={cn(
              "w-full justify-between rounded-md px-2.5 active:scale-100",
              fieldClass,
              !value && "text-[#94A3B8]",
            )}
          >
            <span className={cn("truncate", value && "text-nt-text")}>
              {value ? formatDisplayDate(value) : "Select date"}
            </span>
            <CalendarIcon className="h-4 w-4 shrink-0 text-nt-primary" aria-hidden />
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
              onChange(formatChalanDate(day));
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

function preventNumberWheel(event: WheelEvent<HTMLInputElement>) {
  event.currentTarget.blur();
}

const emptyDraft = (): AdjustmentItem => ({
  id: 0,
  itemCode: "",
  productId: null,
  packType: "",
  itemName: "",
  batchNo: "",
  currentStock: 0,
  adjustType: "",
  correctionDirection: "",
  adjustedQty: 0,
  adjustReason: "",
  remarks: "",
});

function adjustTypeBadge(type: string) {
  const styles: Record<string, string> = {
    "Write off": "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]",
    Found: "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]",
    Damaged: "bg-[#FFFBEB] text-[#D97706] dark:bg-[#3B2A0A] dark:text-[#FBBF24]",
    Expired: "bg-[#F8FAFC] text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]",
    Correction: "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
        styles[type] || "bg-[#F8FAFC] text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]",
      )}
    >
      {type || "—"}
    </span>
  );
}

export default function NewAdjustment() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [chalanDate, setChalanDate] = useState(() => formatChalanDate(new Date()));
  const [selectedStore, setSelectedStore] = useState("");
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [records, setRecords] = useState<AdjustedRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [draft, setDraft] = useState<AdjustmentItem>(emptyDraft);
  const [draftSnapshot, setDraftSnapshot] = useState<AdjustmentItem>(emptyDraft);
  const [formSnapshot, setFormSnapshot] = useState({ date: "", store: "", itemCount: 0 });
  const [committingItem, setCommittingItem] = useState(false);
  const { toast } = useToast();

  const { data: depotsResponse, isLoading: depotsLoading } = useQuery({
    queryKey: ["depots"],
    queryFn: apiEndpoints.depots.getAll,
  });

  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: apiEndpoints.products.getAll,
  });

  const { data: stockLedgerResponse } = useQuery({
    queryKey: ["stock-ledger"],
    queryFn: apiEndpoints.stockMaintenance.getLedger,
  });

  const depots = useMemo(() => depotsResponse?.data || depotsResponse || [], [depotsResponse]);
  const products = useMemo(() => productsResponse?.data || productsResponse || [], [productsResponse]);
  const stockLedger = useMemo(
    () => stockLedgerResponse?.data || stockLedgerResponse || [],
    [stockLedgerResponse],
  );

  useEffect(() => {
    setRecords([
      {
        id: 1,
        itemCode: "M01000002",
        packType: "Tab",
        itemName: "Acarbose 50 mg",
        unit: "Nos",
        category: "MEDICINE",
        adjustedQty: 2,
        adjustType: "Write off",
        correctionDirection: "",
        expireDate: "",
        batchNo: "",
      },
    ]);
  }, []);

  const isNumericBatch = (batchNo: string | null | undefined): boolean => {
    if (!batchNo) return false;
    const cleaned = String(batchNo).trim();
    return /^\d+$/.test(cleaned);
  };

  const getFEFOBatches = (productId: number | null, productCode: string) => {
    if (!productId && !productCode) return [];

    const batches = stockLedger
      .filter((item: any) => {
        const matchesProduct = productId
          ? item.product_id === productId
          : item.product_code === productCode || item.product_code === productCode;
        const matchesDepot = selectedStore ? item.depot_id === Number(selectedStore) : true;
        const hasStock = (item.quantity || item.available_quantity || 0) > 0;
        const batchNo = item.batch || item.batch_number;
        return matchesProduct && matchesDepot && hasStock && batchNo && isNumericBatch(batchNo);
      })
      .map((item: any) => ({
        batch: (item.batch || item.batch_number || "").trim(),
        expiryDate: item.expiry_date || item.expiryDate,
        quantity: item.quantity || item.available_quantity || 0,
      }))
      .sort((a, b) => {
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });

    return batches;
  };

  const recordRows: AdjustedRecordRow[] = useMemo(
    () => records.map((record, index) => ({ ...record, sl: index + 1 })),
    [records],
  );

  const draftDirty = JSON.stringify(draft) !== JSON.stringify(draftSnapshot);
  const formDirty =
    selectedStore !== formSnapshot.store ||
    chalanDate !== formSnapshot.date ||
    items.length !== formSnapshot.itemCount ||
    draftDirty;
  const availableBatches = draft.productId ? getFEFOBatches(draft.productId, draft.itemCode) : [];

  const applyProductToDraft = (item: AdjustmentItem, product: any): AdjustmentItem => {
    const updated: AdjustmentItem = {
      ...item,
      itemCode: product.code || product.new_code || product.old_code || String(product.id),
      productId: product.id,
      itemName: product.name || product.product_name || "",
      packType: product.primary_packaging || product.unit_of_measure || product.pack_type || product.packType || "",
    };

    const batches = getFEFOBatches(product.id, product.code || product.new_code || product.old_code);
    if (batches.length > 0) {
      updated.batchNo = batches[0].batch;
      const batchStock = stockLedger.find(
        (s: any) =>
          (s.product_id === product.id ||
            s.product_code === product.code ||
            s.product_code === product.new_code ||
            s.product_code === product.old_code) &&
          s.batch === batches[0].batch &&
          (!selectedStore || s.depot_id === Number(selectedStore)),
      );
      if (batchStock) {
        updated.currentStock = batchStock.quantity || batchStock.available_quantity || 0;
      }
    } else {
      const stockItems = stockLedger.filter(
        (s: any) =>
          (s.product_id === product.id ||
            s.product_code === product.code ||
            s.product_code === product.new_code ||
            s.product_code === product.old_code) &&
          (!selectedStore || s.depot_id === Number(selectedStore)),
      );
      const totalStock = stockItems.reduce(
        (sum: number, s: any) => sum + (s.quantity || s.available_quantity || 0),
        0,
      );
      updated.currentStock = totalStock;
    }

    return updated;
  };

  const resetItemEditor = () => {
    setEditingItemId(null);
    setDraft(emptyDraft());
    setDraftSnapshot(emptyDraft());
    setCommittingItem(false);
  };

  const resetAdjustmentForm = () => {
    const today = formatChalanDate(new Date());
    setChalanDate(today);
    setSelectedStore("");
    setItems([]);
    resetItemEditor();
  };

  const closeAdjustmentModal = () => {
    setAdjustmentModalOpen(false);
    resetAdjustmentForm();
    setDiscardOpen(false);
  };

  const openAdjustmentModal = () => {
    const today = formatChalanDate(new Date());
    resetAdjustmentForm();
    setFormSnapshot({ date: today, store: "", itemCount: 0 });
    setAdjustmentModalOpen(true);
  };

  const openAddItemEditor = () => {
    const next = emptyDraft();
    setEditingItemId(null);
    setDraft(next);
    setDraftSnapshot(next);
  };

  const openEditItemEditor = (item: AdjustmentItem) => {
    const next = { ...item };
    setEditingItemId(item.id);
    setDraft(next);
    setDraftSnapshot(next);
  };

  const handleAddItem = () => {
    openAddItemEditor();
  };

  const handleRemoveItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
    setRecords(records.filter((record) => record.id !== id));
  };

  const itemToRecord = (item: AdjustmentItem, id: number): AdjustedRecord => {
    const batches = getFEFOBatches(item.productId, item.itemCode);
    const selectedBatch = batches.find((b: { batch: string }) => b.batch === item.batchNo);
    return {
      id,
      itemCode: item.itemCode,
      productId: item.productId,
      packType: item.packType,
      itemName: item.itemName,
      unit: "Nos",
      category: "",
      adjustedQty: item.adjustedQty,
      adjustType: item.adjustType,
      correctionDirection: item.correctionDirection,
      expireDate: selectedBatch?.expiryDate || "",
      batchNo: item.batchNo,
    };
  };

  const validateItem = (item: AdjustmentItem) => {
    if (!item.itemCode || !item.batchNo || !item.adjustType || !item.adjustedQty || !item.adjustReason) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Item Code, Batch No, Adjust Type, Adjusted Qty, Adjust Reason)",
        variant: "destructive",
      });
      return false;
    }

    if (!(item.adjustedQty > 0)) {
      toast({
        title: "Validation Error",
        description: "Enter a positive adjustment quantity. The adjustment type sets the stock direction.",
        variant: "destructive",
      });
      return false;
    }

    if (item.adjustType === "Correction" && !item.correctionDirection) {
      toast({
        title: "Validation Error",
        description: "Select increase or decrease for a correction.",
        variant: "destructive",
      });
      return false;
    }

    if (!isNumericBatch(item.batchNo)) {
      toast({
        title: "Invalid batch number",
        description: "Batch number must be numeric only (digits only).",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleCommitDraft = () => {
    if (committingItem) return;
    if (!validateItem(draft)) return;

    setCommittingItem(true);
    if (editingItemId != null) {
      const updated = { ...draft, id: editingItemId };
      setItems(items.map((item) => (item.id === editingItemId ? updated : item)));
      setRecords(records.map((record) => (record.id === editingItemId ? itemToRecord(updated, editingItemId) : record)));
      resetItemEditor();
      return;
    }

    const id = Date.now();
    const item = { ...draft, id };
    setItems([...items, item]);
    setRecords([...records, itemToRecord(item, id)]);
    toast({
      title: "Success",
      description: "Item added to adjustment records",
    });
    resetItemEditor();
  };

  const handleDraftChange = (field: keyof AdjustmentItem, value: any) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === "adjustType" && value !== "Correction" ? { correctionDirection: "" as const } : {}),
    }));
  };

  const handleDraftBatchChange = (value: string) => {
    if (value && !/^\d+$/.test(value)) {
      toast({
        title: "Invalid batch number",
        description: "Batch numbers must be numeric only (digits only).",
        variant: "destructive",
      });
      return;
    }
    const selectedBatch = availableBatches.find((b: { batch: string }) => b.batch === value);
    setDraft((current) => ({
      ...current,
      batchNo: value,
      currentStock: selectedBatch ? selectedBatch.quantity : current.currentStock,
    }));
  };

  const handleSave = async () => {
    if (!selectedStore) {
      toast({
        title: "Validation Error",
        description: "Please select a store",
        variant: "destructive",
      });
      return;
    }

    if (records.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one item to the adjustment records",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const [day, month, year] = chalanDate.split("/");
      const adjustmentDate = `${year}-${month}-${day}`;

      const adjustmentType = records[0]?.adjustType || "";
      if (records.some((record) => record.adjustType !== adjustmentType)) {
        throw new Error("Use one adjustment type for each chalan. The request stores a single type.");
      }

      const items = records.map((record) => {
        if (!record.productId) {
          throw new Error(`Product ID missing for item: ${record.itemCode}`);
        }

        return {
          product_id: record.productId,
          batch: record.batchNo || null,
          quantity_change: signedAdjustmentQuantity(
            record.adjustType,
            Number(record.adjustedQty),
            record.correctionDirection,
          ),
        };
      });

      const payload = {
        adjustment_date: adjustmentDate,
        depot_id: Number(selectedStore),
        adjustment_type: adjustmentType,
        reason: records.map((r) => `${r.itemName}: ${r.adjustType}`).join("; "),
        status: "Pending",
        items: items,
      };

      await apiEndpoints.stockAdjustments.create(payload);

      toast({
        title: "Success",
        description: `Stock adjustment chalan saved successfully with ${records.length} item(s)`,
      });

      navigate("/warehouse/adjustment/request");
    } catch (error: any) {
      console.error("Failed to save adjustment", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save stock adjustment",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setItems([]);
    setSelectedStore("");
    closeAdjustmentModal();
  };

  const requestCloseAdjustment = () => {
    if (formDirty) {
      setDiscardOpen(true);
      return;
    }
    handleCancel();
  };

  const handleDeleteRecord = (id: number) => {
    setRecords(records.filter((record) => record.id !== id));
    setItems(items.filter((item) => item.id !== id));
  };

  const recordColumns: DataTableColumn<AdjustedRecordRow>[] = [
    { key: "sl", label: "SL", className: "tabular-nums text-[#64748B]" },
    {
      key: "itemCode",
      label: "Item Code",
      render: (val) => (
        <span className="rounded-md bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-xs text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]">
          {String(val || "—")}
        </span>
      ),
    },
    { key: "packType", label: "Pack Type", render: (val) => String(val || "—") },
    {
      key: "itemName",
      label: "Item Name",
      render: (val) => <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val || "—")}</span>,
    },
    { key: "unit", label: "A/U", render: (val) => String(val || "—") },
    { key: "category", label: "Category", render: (val) => String(val || "—") },
    {
      key: "adjustedQty",
      label: "Adjusted Qty",
      align: "right",
      className: "tabular-nums font-semibold",
    },
    {
      key: "adjustType",
      label: "Adjust Type",
      render: (val, row) => (
        <span className="inline-flex items-center gap-1.5">
          {adjustTypeBadge(String(val || ""))}
          {row.correctionDirection ? (
            <span className="text-[11px] font-medium text-[#475569] dark:text-[#A9B8CC]">{row.correctionDirection}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "expireDate",
      label: "Expire Date",
      render: (val) => String(val || "-"),
    },
    {
      key: "id",
      label: "Action",
      align: "right",
      headerClassName: "text-right",
      render: (_val, row) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteRecord(row.id)}
              aria-label="Delete record"
              className="h-8 w-8 rounded-md text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626] dark:hover:bg-[#3B1212] dark:hover:text-[#FCA5A5]"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
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
        <motion.div {...sectionMotion} className="flex shrink-0 justify-end">
          <Button type="button" variant="ntPrimary" onClick={openAdjustmentModal} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New Adjustment
          </Button>
        </motion.div>

        <motion.div {...sectionMotion} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 flex-1"
            title="Adjusted Stock Records"
            description="Items staged for this adjustment chalan."
            toolbarIcon={<Package className="h-4 w-4" aria-hidden />}
            data={recordRows}
            columns={recordColumns}
            getRowId={(row) => row.id}
            resetPageKey={records.length}
            emptyMessage="No records found"
          />
        </motion.div>
      </div>

      <Dialog
        open={adjustmentModalOpen}
        onOpenChange={(open) => {
          if (open) {
            setAdjustmentModalOpen(true);
            return;
          }
          requestCloseAdjustment();
        }}
      >
        <DialogContent className={cn(NAVY_TEAL_SCOPE_CLASS, "flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border border-[#E3EAF3] bg-white p-0 shadow-[0_24px_48px_rgba(15,23,42,0.16)] dark:border-[#2C3B50] dark:bg-[#151F30] sm:h-auto sm:max-h-[90vh] sm:w-[calc(100%-1.5rem)] sm:max-w-[1200px] sm:rounded-[20px]")}>
          <DialogHeader className="shrink-0 space-y-0.5 border-b border-[#E3EAF3] px-5 py-3 text-left dark:border-[#2C3B50]">
            <div className="flex items-start gap-3 pr-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                <ClipboardList className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  New Stock Adjustment
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  Create and review inventory adjustments.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="nt-form nt-form-compact flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
            <div className="overflow-hidden px-5 py-3 md:w-[58%] md:shrink-0 md:border-r md:border-[#E3EAF3] dark:md:border-[#2C3B50]">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">General information</h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className={fieldWrapClass}>
                  <Label htmlFor="chalanDate" className={labelClass}>
                    Chalan Date <span className="text-red-500">*</span>
                  </Label>
                  <ChalanDateField id="chalanDate" value={chalanDate} onChange={setChalanDate} />
                </div>

                <div className={fieldWrapClass}>
                  <Label htmlFor="store" className={labelClass}>
                    Store <span className="text-red-500">*</span>
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
                          <SelectItem key={depot.id} value={String(depot.id)} className={selectItemClass}>
                            <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#EAF2FC] text-[#0C4DA1]">
                              <Warehouse className="h-3.5 w-3.5" aria-hidden />
                            </span>
                            {depot.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="mt-3 border-t border-[#E3EAF3] pt-3 dark:border-[#2C3B50]">
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {editingItemId != null ? "Edit item" : "Item editor"}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#A9B8CC]">
                  Select products, batches, and quantities to adjust.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className={cn(fieldWrapClass, "sm:col-span-2")}>
                  <Label className={labelClass}>
                    Item Code <span className="text-red-500">*</span>
                  </Label>
                  <ItemCodeSelect
                    products={products}
                    value={draft.productId ? String(draft.productId) : undefined}
                    onSelect={(product) => setDraft((current) => applyProductToDraft(current, product))}
                    disabled={productsLoading}
                    loading={productsLoading}
                  />
                </div>
                <div className={fieldWrapClass}>
                  <Label className={labelClass}>Item Name</Label>
                  <Input value={draft.itemName} readOnly placeholder="Item Name" className={cn("w-full", fieldClass)} />
                </div>
                <div className={fieldWrapClass}>
                  <Label className={labelClass}>Pack Type</Label>
                  <Input value={draft.packType} readOnly placeholder="Pack Type" className={cn("w-full", fieldClass)} />
                </div>
                <div className={fieldWrapClass}>
                  <Label className={labelClass}>
                    Batch No. <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={draft.batchNo}
                      onChange={(e) => handleDraftBatchChange(e.target.value.trim())}
                      placeholder="Enter batch (numeric only)"
                      className={cn("w-full", fieldClass)}
                      disabled={!draft.productId}
                    />
                    {availableBatches.filter((b: { batch: string }) => isNumericBatch(b.batch)).length > 0 && (
                      <Select value="" onValueChange={(val) => handleDraftBatchChange(val.trim())}>
                        <SelectTrigger className={cn("w-[140px]", fieldClass)}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className={selectPanelClass}>
                          {availableBatches
                            .filter((b: { batch: string }) => isNumericBatch(b.batch))
                            .map((batch: { batch: string; expiryDate?: string }, idx: number) => (
                              <SelectItem key={idx} value={batch.batch} className={selectItemClass}>
                                {batch.batch}{" "}
                                {batch.expiryDate ? `(Exp: ${new Date(batch.expiryDate).toLocaleDateString()})` : ""}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div className={fieldWrapClass}>
                  <Label className={labelClass}>Current Stock</Label>
                  <Input
                    type="number"
                    value={draft.currentStock}
                    readOnly
                    onWheel={preventNumberWheel}
                    className={cn("w-full", fieldClass)}
                  />
                </div>
                <div className={fieldWrapClass}>
                  <Label className={labelClass}>
                    Adjust Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={draft.adjustType} onValueChange={(val) => handleDraftChange("adjustType", val)}>
                    <SelectTrigger className={cn("w-full", fieldClass)}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className={selectPanelClass}>
                      <SelectItem value="Write off" className={selectItemClass}>
                        Write off
                      </SelectItem>
                      <SelectItem value="Found" className={selectItemClass}>
                        Found
                      </SelectItem>
                      <SelectItem value="Damaged" className={selectItemClass}>
                        Damaged
                      </SelectItem>
                      <SelectItem value="Expired" className={selectItemClass}>
                        Expired
                      </SelectItem>
                      <SelectItem value="Correction" className={selectItemClass}>
                        Correction
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {draft.adjustType === "Correction" && (
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>
                      Correction Direction <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={draft.correctionDirection}
                      onValueChange={(val) => handleDraftChange("correctionDirection", val)}
                    >
                      <SelectTrigger className={cn("w-full", fieldClass)}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        <SelectItem value="Increase" className={selectItemClass}>
                          Increase
                        </SelectItem>
                        <SelectItem value="Decrease" className={selectItemClass}>
                          Decrease
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className={fieldWrapClass}>
                  <Label className={labelClass}>
                    Adjusted Qty <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={draft.adjustedQty || ""}
                    onChange={(e) => handleDraftChange("adjustedQty", Number(e.target.value))}
                    onWheel={preventNumberWheel}
                    placeholder="0"
                    className={cn("w-full", fieldClass)}
                  />
                </div>
                <div className={fieldWrapClass}>
                  <Label className={labelClass}>
                    Adjust Reason <span className="text-red-500">*</span>
                  </Label>
                  <Select value={draft.adjustReason} onValueChange={(val) => handleDraftChange("adjustReason", val)}>
                    <SelectTrigger className={cn("w-full", fieldClass)}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className={selectPanelClass}>
                      <SelectItem value="Damaged" className={selectItemClass}>
                        Damaged
                      </SelectItem>
                      <SelectItem value="Expired" className={selectItemClass}>
                        Expired
                      </SelectItem>
                      <SelectItem value="Found" className={selectItemClass}>
                        Found
                      </SelectItem>
                      <SelectItem value="Missing" className={selectItemClass}>
                        Missing
                      </SelectItem>
                      <SelectItem value="Other" className={selectItemClass}>
                        Other
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={fieldWrapClass}>
                  <Label className={labelClass}>Remarks</Label>
                  <Input
                    value={draft.remarks}
                    onChange={(e) => handleDraftChange("remarks", e.target.value)}
                    placeholder="Remarks"
                    className={cn("w-full", fieldClass)}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {editingItemId != null ? (
                  <Button type="button" variant="ntSecondary" onClick={resetItemEditor}>
                    Cancel Edit
                  </Button>
                ) : null}
                <Button type="button" variant="ntPrimary" onClick={handleCommitDraft} disabled={committingItem}>
                  {committingItem ? (
                    <LoadingSpinner size="sm" />
                  ) : editingItemId != null ? (
                    "Update Item"
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Item
                    </>
                  )}
                </Button>
              </div>
            </section>
            </div>

            <aside className="flex min-h-0 w-full flex-col overflow-hidden bg-[#F8FAFC] md:w-[42%] dark:bg-[#101826]">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E3EAF3] px-4 py-3 dark:border-[#2C3B50]">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Adjustment Items</h3>
                  <span className="rounded-full bg-[#EAF2FC] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                    {items.length}
                  </span>
                </div>
                <Button type="button" variant="ntSecondary" onClick={handleAddItem} className="shrink-0">
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-1 px-3 py-8 text-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                      <PackagePlus className="h-4 w-4" aria-hidden />
                    </span>
                    <p className="text-sm font-medium text-[#172B4D] dark:text-[#F1F5F9]">No items added yet.</p>
                    <p className="text-xs text-[#64748B] dark:text-[#A9B8CC]">Use the editor to add an adjustment item.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {items.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                          transition={{ duration: reduceMotion ? 0 : 0.16 }}
                          className={cn(
                            "rounded-xl border bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#2C3B50] dark:bg-[#151F30]",
                            editingItemId === item.id ? "border-[#0C4DA1]" : "border-[#E3EAF3]",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{item.itemName || "—"}</p>
                              <p className="mt-0.5 font-mono text-[11px] text-[#64748B] dark:text-[#A9B8CC]">{item.itemCode || "—"}</p>
                            </div>
                            <div className="flex shrink-0 items-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditItemEditor(item)}
                                    aria-label="Edit item"
                                    className="h-8 w-8 rounded-md text-[#475569] hover:bg-[#EAF2FC] hover:text-[#0C4DA1]"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveItem(item.id)}
                                    aria-label="Remove item"
                                    className="h-8 w-8 rounded-md text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] text-[#64748B]">Batch {item.batchNo || "—"}</span>
                            {adjustTypeBadge(item.adjustType)}
                            {item.correctionDirection ? (
                              <span className="text-[11px] font-medium text-[#475569] dark:text-[#A9B8CC]">
                                {item.correctionDirection}
                              </span>
                            ) : null}
                            <span className="ml-auto text-sm font-semibold tabular-nums text-[#172B4D] dark:text-[#F1F5F9]">
                              {item.adjustedQty}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </aside>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-[#E3EAF3] px-5 py-3 dark:border-[#2C3B50] sm:justify-end">
            <Button type="button" variant="ntSecondary" onClick={requestCloseAdjustment} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" variant="ntPrimary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                "Save Adjustment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this adjustment?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Closing now will not save this stock adjustment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ThemeScope>
  );
}
