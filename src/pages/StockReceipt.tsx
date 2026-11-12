import { useState, useEffect, type ReactNode, type WheelEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";
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
  Eye,
  Calendar,
  Pill,
  Sun,
  Thermometer,
  Snowflake,
  Warehouse,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { recentReceipts } from "@/lib/mockData";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { masterData, type ProductOption } from "@/lib/masterData";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { brandLabelClasses } from "@/lib/brandTheme";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-9 rounded-lg shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0";
const labelClass = "text-[13px] font-medium text-nt-text";
const primaryBtnClass =
  "h-9 !rounded-sm border-0 bg-[#0C4DA1] px-4 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#093D82] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/40 dark:bg-[#70ADFF] dark:text-[#0B1220] dark:hover:bg-[#9AC6FF]";
const secondaryBtnClass =
  "h-9 !rounded-sm border border-nt-border bg-nt-surface px-4 text-sm font-semibold text-nt-text transition-colors duration-150 hover:bg-nt-muted";
const selectPanelClass =
  "nt-select-panel z-[200] rounded-xl border p-1 shadow-lg";
const selectItemClass =
  "cursor-pointer rounded-md py-2 pl-8 pr-3 text-[13px] leading-snug";
const fieldWrapClass = "min-w-0 space-y-1.5";

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

function DateField({
  id,
  required,
}: {
  id: string;
  required?: boolean;
}) {
  return (
    <div className="nt-date-field">
      <Input id={id} type="date" required={required} className={cn(fieldClass, "w-full pr-10")} />
      <Calendar
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nt-primary"
        aria-hidden
      />
    </div>
  );
}

function FormBlock({
  title,
  extra,
  children,
  className,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("nt-form-block overflow-visible", className)}>
      <header className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold leading-none text-nt-text">{title}</h3>
        {extra}
      </header>
      {children}
    </section>
  );
}

const StockReceipt = () => {
  const reduceMotion = useReducedMotion();
  const [challanVerified, setChallanVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const { sortedData, sortKey, sortOrder, handleSort } = useTableSort(recentReceipts, "date" as any);
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

  const columns = [
    { key: "date" as const, label: "Date", sortable: true },
    { key: "challan" as const, label: "Challan No.", sortable: true },
    { key: "product" as const, label: "Product", sortable: true },
    { key: "batch" as const, label: "Batch", sortable: true },
    { key: "qty" as const, label: "Quantity", sortable: true, align: "right" as const, render: (val: any) => val.toLocaleString() },
    { key: "source" as const, label: "Source", sortable: true },
    {
      key: "id" as const,
      label: "Actions",
      align: "right" as const,
      render: () => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button variant="ghost" size="sm">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ThemeScope className="-mx-6 -my-6 min-h-full w-full px-6 py-6">
      <div className="w-full space-y-5">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.16 }}
        >
          <form className="nt-form nt-form-card overflow-visible p-5 sm:p-6" onSubmit={handleSubmit}>
            <FormBlock
              title="EBS Challan Verification"
              extra={
                challanVerified ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : null
              }
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                <div className="w-full max-w-[420px] space-y-1.5">
                  <Label htmlFor="challanNo" className={labelClass}>Challan Number *</Label>
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
                  className={cn("w-full shrink-0 sm:w-auto", primaryBtnClass)}
                >
                  {verifying ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Verify
                    </>
                  )}
                </Button>
                {challanVerified && (
                  <div className="flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">Verified from Oracle EBS</span>
                  </div>
                )}
              </div>
            </FormBlock>

            <FormBlock title="Product & Batch Details">
              <div className="nt-form-grid nt-form-grid--product">
                <div className={cn(fieldWrapClass, "relative")}>
                  <Label htmlFor="product" className={labelClass}>Product Name *</Label>
                  <ProductSearchSelect
                    products={products}
                    value={selectedProduct}
                    onValueChange={setSelectedProduct}
                    disabled={loadingProducts}
                    loading={loadingProducts}
                  />
                </div>

                <div className={fieldWrapClass}>
                  <Label htmlFor="batch" className={labelClass}>Batch Number * (Numeric Only)</Label>
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
                  <Label htmlFor="qty" className={labelClass}>Quantity *</Label>
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
                  <Label htmlFor="unitPrice" className={labelClass}>Unit Price *</Label>
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

            <FormBlock title="Dates & Storage" className="nt-form-block--no-divider">
              <div className="nt-form-grid nt-form-grid--dates">
                <div className={fieldWrapClass}>
                  <Label htmlFor="mfgDate" className={labelClass}>Manufacturing Date *</Label>
                  <DateField id="mfgDate" required />
                </div>

                <div className={fieldWrapClass}>
                  <Label htmlFor="expDate" className={labelClass}>Expiry Date *</Label>
                  <DateField id="expDate" required />
                </div>

                <div className={fieldWrapClass}>
                  <Label htmlFor="storage" className={labelClass}>Storage Condition *</Label>
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
                  <Label htmlFor="source" className={labelClass}>Source Depot *</Label>
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

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <Button type="button" variant="outline" className={cn("w-full sm:w-auto", secondaryBtnClass)}>
                Cancel
              </Button>
              <Button type="submit" className={cn("w-full sm:w-auto", primaryBtnClass)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Receipt
              </Button>
            </div>
          </form>
        </motion.div>

        <Card className="w-full border border-nt-border bg-nt-surface p-4 shadow-none sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className={cn("text-base font-semibold", brandLabelClasses)}>Recent Receipts</h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Input
                placeholder="Search receipts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn("w-full sm:w-64", fieldClass)}
              />
              <Button variant="outline" size="sm" className={secondaryBtnClass}>
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
            </div>
          </div>
          <DataTable
            data={filteredData}
            columns={columns}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            emptyMessage="No recent receipts found"
          />
        </Card>
      </div>
    </ThemeScope>
  );
};

export default StockReceipt;
