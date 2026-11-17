import { useState, useEffect, useRef, type ReactNode, type WheelEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useNavigation, type CaptionProps } from "react-day-picker";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  CheckCircle,
  Search,
  Printer,
  PackageCheck,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pill,
  Sun,
  Thermometer,
  Snowflake,
  Warehouse,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, DataTableRowActions, type DataTableColumn } from "@/components/data-table";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { recentReceipts } from "@/lib/mockData";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { masterData, type ProductOption } from "@/lib/masterData";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-8 rounded-md shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0";
const labelClass = "text-[13px] font-medium text-nt-text";
const selectPanelClass =
  "nt-select-panel z-[200] rounded-xl border p-1 shadow-lg";
const selectItemClass =
  "cursor-pointer rounded-md py-2 pl-8 pr-3 text-[13px] leading-snug";
const fieldWrapClass = "min-w-0 space-y-1";

function SelectOptionIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}

function preventNumberWheel(event: WheelEvent<HTMLInputElement>) {
  event.currentTarget.blur();
}

function ProductSearchSelect({
  products,
  value,
  onValueChange,
  disabled,
  loading,
}: {
  products: ProductOption[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = products.find((product) => product.id === value);

  return (
    <>
      <input
        tabIndex={-1}
        required
        value={value}
        onChange={() => undefined}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-hidden
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="product"
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              fieldClass,
              !selected && "text-[#94A3B8]",
            )}
          >
            <span className="flex min-w-0 items-center">
              {selected ? (
                <>
                  <SelectOptionIcon icon={Pill} />
                  <span className="truncate text-nt-text">
                    {selected.oldCode} — {selected.name}
                  </span>
                </>
              ) : (
                loading ? "Loading products..." : "Select product"
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
            <CommandInput placeholder="" className="h-9" />
            <CommandList className="max-h-[260px] overscroll-contain py-1">
              <CommandEmpty className="py-4 text-xs text-[#64748B]">
                {loading ? "Loading..." : products.length === 0 ? "No products available" : "No products found."}
              </CommandEmpty>
              <CommandGroup className="p-0">
                {products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={`${product.oldCode} ${product.newCode} ${product.name} ${product.id}`}
                    onSelect={() => {
                      onValueChange(product.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer gap-2 rounded-md px-2 py-1.5"
                  >
                    <SelectOptionIcon icon={Pill} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium leading-tight">
                        {product.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] leading-tight text-[#64748B] dark:text-[#A9B8CC]">
                        {product.oldCode}
                      </span>
                    </span>
                    {value === product.id ? <Check className="h-3.5 w-3.5 shrink-0 text-[#0C4DA1]" /> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}

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

function DateField({
  id,
  required,
}: {
  id: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [month, setMonth] = useState<Date>(new Date());
  const selected = value ? parseISODate(value) : undefined;
  const { fromYear, toYear } = getDateYearBounds();

  return (
    <div className="nt-date-field relative">
      <input
        tabIndex={-1}
        required={required}
        value={value}
        onChange={() => undefined}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-hidden
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between border border-[#CBD5E1] bg-white font-normal shadow-none hover:bg-white",
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
              setValue(toISODate(day));
              setMonth(day);
              setOpen(false);
            }}
            fromYear={fromYear}
            toYear={toYear}
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
              day_outside: "text-[#CBD5E1] opacity-100 aria-selected:bg-[#0C4DA1] aria-selected:text-white dark:text-[#64748B]",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FormBlock({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="nt-form-block overflow-visible">
      <header className="mb-2 flex items-center gap-2">
        <h3 className="text-[13px] font-semibold leading-none text-nt-text">{title}</h3>
        {extra}
      </header>
      {children}
    </section>
  );
}

type RecentReceipt = (typeof recentReceipts)[number];

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function printHtmlDocument(title: string, bodyHtml: string) {
  const previous = document.getElementById("stock-receipt-print-frame");
  previous?.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "stock-receipt-print-frame";
  iframe.setAttribute("title", title);
  iframe.style.cssText = "position:absolute;left:-9999px;top:0;width:210mm;height:297mm;border:0;";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    toast.error("Unable to open print preview.");
    return;
  }

  frameDocument.open();
  frameDocument.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4 portrait; margin: 12mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 8px; }
      h1 { font-size: 20px; letter-spacing: .08em; text-align: center; margin: 0 0 4px; }
      .subtitle { text-align: center; text-transform: uppercase; font-size: 13px; margin: 0 0 4px; }
      .muted { text-align: center; color: #555; font-size: 12px; margin: 0 0 16px; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; font-size: 13px; margin-bottom: 16px; }
      .meta p { margin: 3px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #111; padding: 6px 8px; }
      th { text-transform: uppercase; background: #f3f3f3; }
      .center { text-align: center; }
      .right { text-align: right; }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`);
  frameDocument.close();

  const cleanup = () => {
    iframe.remove();
  };
  frameWindow.addEventListener("afterprint", cleanup);
  window.setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
  }, 150);
}

function printReceiptRow(row: RecentReceipt) {
  printHtmlDocument(
    `Product Receive Report ${row.id}`,
    `<h1>RENATA LIMITED</h1>
     <p class="subtitle">Product Receive Report</p>
     <p class="muted">Receipt ${escapeHtml(row.id)}</p>
     <div class="meta">
       <div>
         <p><strong>Receipt No:</strong> ${escapeHtml(row.id)}</p>
         <p><strong>Source type:</strong> ${escapeHtml(row.source)}</p>
         <p><strong>Issued date:</strong> ${escapeHtml(row.date)}</p>
         <p><strong>Challan No:</strong> ${escapeHtml(row.challan)}</p>
         <p><strong>Delivery person:</strong> —</p>
       </div>
       <div>
         <p><strong>Vehicle:</strong> —</p>
         <p><strong>TFA number:</strong> —</p>
         <p><strong>ISO number:</strong> —</p>
         <p><strong>VAT number:</strong> —</p>
       </div>
     </div>
     <table>
       <thead>
         <tr>
           <th>Legacy Code</th><th>Item Code</th><th>Item Name</th><th>Pack Size</th>
           <th>UOM</th><th>Expiry Date</th><th>Batch No.</th><th>No. of IFC</th>
           <th>Depot Qty</th><th>IFC/Full MC</th><th>No. of Full MC</th><th>IFC in Loose MC</th>
         </tr>
       </thead>
       <tbody>
         <tr>
           <td class="center"></td><td class="center"></td>
           <td>${escapeHtml(row.product)}</td>
           <td class="center"></td><td class="center"></td><td class="center"></td>
           <td class="center">${escapeHtml(row.batch)}</td>
           <td class="right"></td>
           <td class="right">${escapeHtml(row.qty.toLocaleString())}</td>
           <td class="right"></td><td class="right"></td><td class="right"></td>
         </tr>
         <tr>
           <td class="right" colspan="8"><strong>Total</strong></td>
           <td class="right"><strong>${escapeHtml(row.qty.toLocaleString())}</strong></td>
           <td colspan="3"></td>
         </tr>
       </tbody>
     </table>`,
  );
}

function printReceiptReport(rows: RecentReceipt[]) {
  if (rows.length === 0) {
    toast.error("No receipts to print.");
    return;
  }

  const total = rows.reduce((sum, row) => sum + row.qty, 0);
  const tableRows = rows
    .map(
      (row) => `<tr>
        <td class="center">${escapeHtml(row.date)}</td>
        <td class="center">${escapeHtml(row.challan)}</td>
        <td>${escapeHtml(row.product)}</td>
        <td class="center">${escapeHtml(row.batch)}</td>
        <td class="right">${escapeHtml(row.qty.toLocaleString())}</td>
        <td>${escapeHtml(row.source)}</td>
      </tr>`,
    )
    .join("");

  printHtmlDocument(
    "Product Receive Report",
    `<h1>RENATA LIMITED</h1>
     <p class="subtitle">Product Receive Report</p>
     <p class="muted">${rows.length} record${rows.length === 1 ? "" : "s"}</p>
     <table>
       <thead>
         <tr>
           <th>Date</th><th>Challan No.</th><th>Item Name</th>
           <th>Batch No.</th><th>Depot Qty</th><th>Source</th>
         </tr>
       </thead>
       <tbody>
         ${tableRows}
         <tr>
           <td class="right" colspan="4"><strong>Total</strong></td>
           <td class="right"><strong>${escapeHtml(total.toLocaleString())}</strong></td>
           <td></td>
         </tr>
       </tbody>
     </table>`,
  );
}

const StockReceipt = () => {
  const reduceMotion = useReducedMotion();
  const [challanVerified, setChallanVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [viewingReceipt, setViewingReceipt] = useState<RecentReceipt | null>(null);
  const { sortedData, sortKey, sortOrder, handleSort } = useTableSort(recentReceipts, "date");
  const { filteredData, searchTerm, setSearchTerm } = useTableFilter(sortedData);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const productData = await masterData.getProducts();
        setProducts(productData);
      } catch (error) {
        console.error("Failed to load products", error);
        toast.error("Failed to load products. Please try again.");
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  const handleChallanVerify = async () => {
    setVerifying(true);
    // Simulate EBS verification
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setChallanVerified(true);
    setVerifying(false);
    toast.success("Challan verified successfully from Oracle EBS");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challanVerified) {
      toast.error("Please verify challan number from Oracle EBS first");
      return;
    }
    toast.success("Stock receipt recorded successfully");
  };

  const columns: DataTableColumn<RecentReceipt>[] = [
    { key: "date", label: "Date", sortable: true, className: "whitespace-nowrap tabular-nums text-[#475569]" },
    {
      key: "challan",
      label: "Challan No.",
      sortable: true,
      render: (val) => <span className="font-mono text-[13px] font-medium text-[#0C4DA1]">{String(val)}</span>,
    },
    {
      key: "product",
      label: "Product",
      sortable: true,
      render: (val) => <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val)}</span>,
    },
    { key: "batch", label: "Batch", sortable: true, className: "font-mono text-[13px] text-[#475569]" },
    {
      key: "qty",
      label: "Quantity",
      sortable: true,
      align: "right",
      className: "tabular-nums font-semibold",
      render: (val) => Number(val).toLocaleString(),
    },
    { key: "source" as const, label: "Source", sortable: true },
    {
      key: "id" as const,
      label: "Actions",
      align: "right" as const,
      render: (_val, row) => (
        <DataTableRowActions
          onView={() => setViewingReceipt(row)}
          onPrint={() => printReceiptRow(row)}
        />
      ),
    },
  ];

  return (
    <ThemeScope className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden">
        <motion.div
          className="shrink-0"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.16 }}
        >
          <form className="nt-form nt-form-compact nt-form-card overflow-visible px-5 py-4" onSubmit={handleSubmit}>
            <FormBlock
              title="EBS Challan Verification"
              extra={
                challanVerified ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : null
              }
            >
              <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end">
                <div className={cn(fieldWrapClass, "min-w-0 flex-1")}>
                  <Label htmlFor="challanNo" className={labelClass}>
                    Challan Number *
                  </Label>
                  <Input
                    id="challanNo"
                    placeholder="Enter challan number"
                    className={cn("w-full", fieldClass)}
                    required
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleChallanVerify}
                  disabled={verifying || challanVerified}
                  variant="ntPrimary"
                  className="!h-8 shrink-0"
                >
                  {verifying ? <LoadingSpinner size="sm" className="mr-1" /> : <Search className="h-3.5 w-3.5" />}
                  {verifying ? "Verifying..." : challanVerified ? "Verified" : "Verify"}
                </Button>
              </div>
            </FormBlock>

            <FormBlock title="Product & Batch Details">
              <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.8fr)]">
                <div className={cn(fieldWrapClass, "relative")}>
                  <Label htmlFor="product" className={labelClass}>
                    Product Name *
                  </Label>
                  <ProductSearchSelect
                    products={products}
                    value={selectedProduct}
                    onValueChange={setSelectedProduct}
                    disabled={loadingProducts}
                    loading={loadingProducts}
                  />
                </div>
                <div className={fieldWrapClass}>
                  <Label htmlFor="batch" className={labelClass}>
                    Batch Number * (Numeric Only)
                  </Label>
                  <Input
                    id="batch"
                    placeholder="Enter batch number (digits only)"
                    required
                    pattern="[0-9]+"
                    title="Batch number must contain only digits"
                    className={fieldClass}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value && !/^\d+$/.test(value)) {
                        e.target.setCustomValidity("Batch number must be numeric only (digits only)");
                      } else {
                        e.target.setCustomValidity("");
                      }
                    }}
                  />
                </div>
                <div className={fieldWrapClass}>
                  <Label htmlFor="qty" className={labelClass}>
                    Quantity *
                  </Label>
                  <Input
                    id="qty"
                    type="number"
                    placeholder="0"
                    required
                    min="1"
                    className={fieldClass}
                    onWheel={preventNumberWheel}
                  />
                </div>
                <div className={fieldWrapClass}>
                  <Label htmlFor="unitPrice" className={labelClass}>
                    Unit Price *
                  </Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                    min="0"
                    className={fieldClass}
                    onWheel={preventNumberWheel}
                  />
                </div>
              </div>
            </FormBlock>

            <FormBlock title="Dates & Storage">
              <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
                <div className={fieldWrapClass}>
                  <Label htmlFor="mfgDate" className={labelClass}>
                    Manufacturing Date *
                  </Label>
                  <DateField id="mfgDate" required />
                </div>
                <div className={fieldWrapClass}>
                  <Label htmlFor="expDate" className={labelClass}>
                    Expiry Date *
                  </Label>
                  <DateField id="expDate" required />
                </div>
                <div className={fieldWrapClass}>
                  <Label htmlFor="storage" className={labelClass}>
                    Storage Condition *
                  </Label>
                  <Select required>
                    <SelectTrigger id="storage" className={fieldClass}>
                      <SelectValue placeholder="Select storage type" />
                    </SelectTrigger>
                    <SelectContent className={selectPanelClass}>
                      <SelectItem value="ambient" className={selectItemClass}>
                        <SelectOptionIcon icon={Sun} />
                        Ambient (15-25°C)
                      </SelectItem>
                      <SelectItem value="cool" className={selectItemClass}>
                        <SelectOptionIcon icon={Thermometer} />
                        Cool (8-15°C)
                      </SelectItem>
                      <SelectItem value="cold" className={selectItemClass}>
                        <SelectOptionIcon icon={Thermometer} />
                        Cold (2-8°C)
                      </SelectItem>
                      <SelectItem value="frozen" className={selectItemClass}>
                        <SelectOptionIcon icon={Snowflake} />
                        Frozen (-20°C)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={fieldWrapClass}>
                  <Label htmlFor="source" className={labelClass}>
                    Source Depot *
                  </Label>
                  <Select required>
                    <SelectTrigger id="source" className={fieldClass}>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent className={selectPanelClass}>
                      <SelectItem value="mumbai" className={selectItemClass}>
                        <SelectOptionIcon icon={Warehouse} />
                        Mumbai Central
                      </SelectItem>
                      <SelectItem value="delhi" className={selectItemClass}>
                        <SelectOptionIcon icon={Warehouse} />
                        Delhi Main
                      </SelectItem>
                      <SelectItem value="bangalore" className={selectItemClass}>
                        <SelectOptionIcon icon={Warehouse} />
                        Bangalore Hub
                      </SelectItem>
                      <SelectItem value="chennai" className={selectItemClass}>
                        <SelectOptionIcon icon={Warehouse} />
                        Chennai Depot
                      </SelectItem>
                      <SelectItem value="hyderabad" className={selectItemClass}>
                        <SelectOptionIcon icon={Warehouse} />
                        Hyderabad Warehouse
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormBlock>

            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="ntSecondary" className="!h-8">
                Cancel
              </Button>
              <Button type="submit" variant="ntPrimary" className="!h-8">
                <CheckCircle className="h-3.5 w-3.5" />
                Confirm Receipt
              </Button>
            </div>
          </form>
        </motion.div>

        <DataTable
          className="min-h-0 flex-1"
          title="Recent Receipts"
          description="Manage and review incoming warehouse receipts."
          toolbarIcon={<PackageCheck className="h-4 w-4" aria-hidden />}
          search={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: "Search receipts...",
          }}
          toolbarActions={
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ntSecondary"
                  onClick={() => printReceiptReport(filteredData)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
              </TooltipTrigger>
              <TooltipContent>Print Report</TooltipContent>
            </Tooltip>
          }
          data={filteredData}
          columns={columns}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={handleSort}
          getRowId={(row) => row.id}
          resetPageKey={searchTerm}
          emptyMessage="No recent receipts found"
        />

        <Dialog open={Boolean(viewingReceipt)} onOpenChange={(open) => !open && setViewingReceipt(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Receipt details</DialogTitle>
              <DialogDescription>
                {viewingReceipt ? `Goods receipt ${viewingReceipt.id}` : "Selected warehouse receipt"}
              </DialogDescription>
            </DialogHeader>
            {viewingReceipt ? (
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-[#64748B]">Date</dt>
                  <dd className="mt-0.5 font-medium text-[#172B4D]">{viewingReceipt.date}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-[#64748B]">Challan No.</dt>
                  <dd className="mt-0.5 font-mono font-medium text-[#0C4DA1]">{viewingReceipt.challan}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-[#64748B]">Product</dt>
                  <dd className="mt-0.5 font-medium text-[#172B4D]">{viewingReceipt.product}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-[#64748B]">Batch</dt>
                  <dd className="mt-0.5 font-mono text-[#172B4D]">{viewingReceipt.batch}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-[#64748B]">Quantity</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-[#172B4D]">
                    {viewingReceipt.qty.toLocaleString()}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-[#64748B]">Source</dt>
                  <dd className="mt-0.5 text-[#172B4D]">{viewingReceipt.source}</dd>
                </div>
              </dl>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ntSecondary" onClick={() => setViewingReceipt(null)}>
                Close
              </Button>
              <Button
                type="button"
                variant="ntPrimary"
                onClick={() => viewingReceipt && printReceiptRow(viewingReceipt)}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ThemeScope>
  );
};

export default StockReceipt;
