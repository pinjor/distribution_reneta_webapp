import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Package, ClipboardList, AlertCircle, Layers, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { masterData, type ProductOption } from "@/lib/masterData";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { useTableSort } from "@/hooks/useTableSort";
import { cn } from "@/lib/utils";

interface StockLedgerRow {
  id: number;
  productName: string;
  productCode?: string;
  depotName?: string;
  batch?: string;
  storageType?: string;
  status?: string;
  expiryDate?: string;
  quantity: number;
  availableQuantity: number;
}

interface ProductStockRow {
  id: string;
  productName: string;
  productCode?: string;
  totalQuantity: number;
  batches: number;
  depotCount: number;
  restrictedBatches: number;
  earliestExpiry?: string | null;
}

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const filterSelectClass =
  "h-9 w-full rounded-lg border-[#E3EAF3] bg-white text-sm shadow-none sm:w-[180px] dark:border-[#2C3B50] dark:bg-[#151F30]";
const selectPanelClass = "nt-select-panel z-[200] rounded-xl border p-1 shadow-lg";

function StockMetricCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  accent: "blue" | "green" | "amber";
}) {
  const reduceMotion = useReducedMotion();
  const accents = {
    blue: "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
    green: "bg-[#ECFDF5] text-[#16A34A] dark:bg-[#052E1C] dark:text-[#4ADE80]",
    amber: "bg-[#FFFBEB] text-[#D97706] dark:bg-[#3B2A0A] dark:text-[#FBBF24]",
  };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.16 }}
      className="inline-flex w-fit shrink-0 rounded-xl border border-[#E3EAF3] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors duration-150 hover:bg-[#F8FBFF] dark:border-[#2C3B50] dark:bg-[#151F30] dark:hover:bg-[#1B304D]/40"
    >
      <div className="flex items-center gap-2">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accents[accent])}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="pr-1">
          <p className="text-[11px] font-medium leading-tight text-[#64748B] dark:text-[#A9B8CC]">{label}</p>
          <p className="text-base font-semibold leading-tight tabular-nums text-[#172B4D] dark:text-[#F1F5F9]">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function StockMaintenance() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"products" | "batches">("products");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCycleCount, setShowCycleCount] = useState(false);
  const [countQty, setCountQty] = useState("");
  const [ledger, setLedger] = useState<StockLedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLedgerId, setSelectedLedgerId] = useState<number | null>(null);
  const [masterProducts, setMasterProducts] = useState<ProductOption[]>([]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      try {
        // Load master products and stock ledger in parallel
        const [productsData, ledgerData] = await Promise.all([
          masterData.getProducts(),
          apiEndpoints.stockMaintenance.getLedger(),
        ]);
        
        if (!active) return;
        
        // Set master products
        if (Array.isArray(productsData)) {
          setMasterProducts(productsData);
        }
        
        // Map ledger data with product information from master data
        if (Array.isArray(ledgerData)) {
          const mapped: StockLedgerRow[] = ledgerData
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((item: any) => {
              // Filter to only show products from master data (new medicine products)
              const productId = item.product_id || item.product?.id;
              const masterProduct = productsData.find((p: ProductOption) => p.id === String(productId));
              return masterProduct !== undefined; // Only include products that exist in master data
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => {
              // Try to find product from master data first
              const productId = item.product_id || item.product?.id;
              const masterProduct = productsData.find((p: ProductOption) => p.id === String(productId));
              
              return {
                id: Number(item.id ?? Math.random()),
                productName: masterProduct?.name ?? item.product?.name ?? item.product_name ?? "Unknown product",
                productCode: masterProduct?.oldCode ?? item.product_code ?? item.product?.code ?? item.product?.old_code ?? "",
                depotName: item.depot?.name ?? item.depot_name ?? "",
                batch: item.batch ?? item.batch_number ?? "",
                storageType: item.storage_type ?? item.source_type ?? "",
                status: item.status ?? "Unrestricted",
                expiryDate: item.expiry_date ?? item.expiry ?? "",
                quantity: toNumber(item.quantity ?? item.available_quantity ?? 0),
                availableQuantity: toNumber(item.available_quantity ?? item.quantity ?? 0),
              };
            });
          setLedger(mapped);
        } else {
          setLedger([]);
        }
      } catch (error) {
        console.error("Failed to load stock data", error);
        toast({ title: "Unable to load stock data", variant: "destructive" });
        setLedger([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [toast]);

  const filteredStock = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return ledger.filter((item) => {
      if (sourceFilter !== "all" && (item.storageType || "").toUpperCase() !== sourceFilter.toUpperCase()) {
        return false;
      }
      if (statusFilter !== "all" && (item.status || "").toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      if (!term) return true;
      const haystack = [
        item.productName,
        item.productCode,
        item.batch,
        item.depotName,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return haystack.some((value) => value.includes(term));
    });
  }, [ledger, sourceFilter, statusFilter, searchTerm]);

  const totalBatches = filteredStock.length;
  const totalQuantity = filteredStock.reduce((sum, item) => sum + item.availableQuantity, 0);
  const restrictedCount = filteredStock.filter((item) => (item.status || "").toLowerCase() !== "unrestricted").length;

  const selectedLedger = useMemo(() => {
    if (selectedLedgerId == null) return filteredStock[0];
    return filteredStock.find((item) => item.id === selectedLedgerId) || filteredStock[0];
  }, [filteredStock, selectedLedgerId]);

  const handleCycleCountSubmit = () => {
    toast({
      title: "Cycle count recorded",
      description: discrepancy === 0 ? "No variance detected." : `Variance logged: ${discrepancy} units`,
    });
    setShowCycleCount(false);
    setCountQty("");
  };

  const handleOpenCycleCount = () => {
    if (filteredStock.length === 0) {
      toast({ title: "No ledger entries available", variant: "destructive" });
      return;
    }
    setSelectedLedgerId(filteredStock[0].id);
    setCountQty("");
    setShowCycleCount(true);
  };

  useEffect(() => {
    if (activeTab !== "batches" && showCycleCount) {
      setShowCycleCount(false);
    }
  }, [activeTab, showCycleCount]);

  const productStock = useMemo<ProductStockRow[]>(() => {
    const map = new Map<
      string,
      {
        id: string;
        productName: string;
        productCode?: string;
        totalQuantity: number;
        batches: number;
        depotSet: Set<string>;
        restrictedBatches: number;
        earliestExpiry?: Date | null;
      }
    >();

    // First, add all products from master data (even if they have no stock)
    masterProducts.forEach((product) => {
      const key = product.oldCode || product.id;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          productName: product.name,
          productCode: product.oldCode,
          totalQuantity: 0,
          batches: 0,
          depotSet: new Set<string>(),
          restrictedBatches: 0,
          earliestExpiry: null,
        });
      }
    });

    // Then, aggregate stock data from ledger
    filteredStock.forEach((item) => {
      const key = item.productCode || item.productName;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          productName: item.productName,
          productCode: item.productCode,
          totalQuantity: 0,
          batches: 0,
          depotSet: new Set<string>(),
          restrictedBatches: 0,
          earliestExpiry: null,
        });
      }

      const entry = map.get(key)!;
      entry.totalQuantity += item.availableQuantity;
      entry.batches += 1;
      if (item.depotName) entry.depotSet.add(item.depotName);
      if ((item.status || "").toLowerCase() !== "unrestricted") {
        entry.restrictedBatches += 1;
      }
      if (item.expiryDate) {
        const expiryDate = new Date(item.expiryDate);
        if (!Number.isNaN(expiryDate.getTime())) {
          if (!entry.earliestExpiry || expiryDate < entry.earliestExpiry) {
            entry.earliestExpiry = expiryDate;
          }
        }
      }
    });

    return Array.from(map.values()).map((entry) => ({
      id: entry.id,
      productName: entry.productName,
      productCode: entry.productCode,
      totalQuantity: entry.totalQuantity,
      batches: entry.batches,
      depotCount: entry.depotSet.size,
      restrictedBatches: entry.restrictedBatches,
      earliestExpiry: entry.earliestExpiry ? entry.earliestExpiry.toISOString() : null,
    }));
  }, [filteredStock, masterProducts]);

  const productMetrics = useMemo(() => {
    const totalProducts = productStock.length;
    const totalQuantity = productStock.reduce((sum, row) => sum + row.totalQuantity, 0);
    const restricted = productStock.filter((row) => row.restrictedBatches > 0).length;
    return { totalProducts, totalQuantity, restricted };
  }, [productStock]);

  const {
    sortedData: sortedProductStock,
    sortKey: productSortKey,
    sortOrder: productSortOrder,
    handleSort: handleProductSort,
  } = useTableSort(productStock, "productName");
  const {
    sortedData: sortedBatchStock,
    sortKey: batchSortKey,
    sortOrder: batchSortOrder,
    handleSort: handleBatchSort,
  } = useTableSort(filteredStock, "productName");

  const productColumns: DataTableColumn<ProductStockRow>[] = [
    {
      key: "productName",
      label: "Product",
      sortable: true,
      render: (val) => <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val)}</span>,
    },
    {
      key: "productCode",
      label: "SKU / Code",
      sortable: true,
      render: (val) => (
        <span className="font-mono text-[13px] text-[#475569] dark:text-[#A9B8CC]">{val ? String(val) : "—"}</span>
      ),
    },
    {
      key: "totalQuantity",
      label: "Total quantity",
      sortable: true,
      align: "right",
      className: "tabular-nums font-semibold",
      render: (val) => Number(val).toLocaleString(),
    },
    {
      key: "batches",
      label: "Batches",
      sortable: true,
      align: "right",
      className: "tabular-nums",
    },
    {
      key: "depotCount",
      label: "Depots",
      sortable: true,
      align: "right",
      className: "tabular-nums",
    },
    {
      key: "restrictedBatches",
      label: "Restricted",
      sortable: true,
      align: "right",
      render: (val) => {
        const count = Number(val) || 0;
        return count > 0 ? (
          <span className="inline-flex min-w-[1.75rem] justify-center rounded-full bg-[#FFFBEB] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#D97706] dark:bg-[#3B2A0A] dark:text-[#FBBF24]">
            {count}
          </span>
        ) : (
          <span className="inline-flex min-w-[1.75rem] justify-center rounded-full border border-[#E3EAF3] bg-white px-2 py-0.5 text-xs tabular-nums text-[#64748B] dark:border-[#2C3B50] dark:bg-[#151F30]">
            0
          </span>
        );
      },
    },
    {
      key: "earliestExpiry",
      label: "Earliest expiry",
      sortable: true,
      render: (val) => (val ? new Date(String(val)).toLocaleDateString() : "—"),
    },
  ];

  const batchColumns: DataTableColumn<StockLedgerRow>[] = [
    {
      key: "productName",
      label: "Product",
      sortable: true,
      render: (_val, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{row.productName}</span>
          {row.productCode ? (
            <span className="font-mono text-xs text-[#64748B] dark:text-[#A9B8CC]">{row.productCode}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "batch",
      label: "Batch No.",
      sortable: true,
      className: "font-mono text-[13px]",
      render: (val) => (val ? String(val) : "—"),
    },
    {
      key: "depotName",
      label: "Depot",
      sortable: true,
      render: (val) => (val ? String(val) : "—"),
    },
    {
      key: "availableQuantity",
      label: "Quantity",
      sortable: true,
      align: "right",
      className: "tabular-nums font-semibold",
      render: (val) => Number(val).toLocaleString(),
    },
    {
      key: "storageType",
      label: "Source",
      sortable: true,
      render: (val) => (
        <span className="inline-flex rounded-full border border-[#E3EAF3] bg-[#F8FAFC] px-2 py-0.5 text-xs font-medium text-[#475569] dark:border-[#2C3B50] dark:bg-[#1B304D] dark:text-[#A9B8CC]">
          {val ? String(val) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (val) => {
        const status = String(val || "");
        const unrestricted = status.toLowerCase() === "unrestricted";
        return (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
              unrestricted
                ? "bg-[#ECFDF5] text-[#16A34A] dark:bg-[#052E1C] dark:text-[#4ADE80]"
                : "bg-[#FFFBEB] text-[#D97706] dark:bg-[#3B2A0A] dark:text-[#FBBF24]",
            )}
          >
            {status || "Hold"}
          </span>
        );
      },
    },
    {
      key: "expiryDate",
      label: "Expiry",
      sortable: true,
      render: (val) => (val ? new Date(String(val)).toLocaleDateString() : "—"),
    },
  ];

  const stockFilters = (
    <>
      <Select value={sourceFilter} onValueChange={setSourceFilter}>
        <SelectTrigger className={filterSelectClass}>
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent className={selectPanelClass}>
          <SelectItem value="all">All Sources</SelectItem>
          <SelectItem value="FACTORY">Factory receipts</SelectItem>
          <SelectItem value="DEPOT">Depot transfers</SelectItem>
          <SelectItem value="RETURN">Stock returns</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className={filterSelectClass}>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className={selectPanelClass}>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="UNRESTRICTED">Unrestricted</SelectItem>
          <SelectItem value="RESTRICTED">Restricted</SelectItem>
          <SelectItem value="HOLD">Hold</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  const systemQuantity = selectedLedger ? selectedLedger.availableQuantity : 0;
  const discrepancy = countQty ? Number(countQty || 0) - systemQuantity : 0;

  return (
    <ThemeScope className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "products" | "batches")}
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden"
      >
        <div className="flex shrink-0 flex-nowrap items-center justify-between gap-3 overflow-x-auto">
          <TabsList className="inline-flex h-9 w-auto shrink-0 gap-1 rounded-lg border border-[#E3EAF3] bg-[#F4F7FB] p-0.5 shadow-none dark:border-[#2C3B50] dark:bg-[#1B283B]">
            <TabsTrigger
              value="products"
              className="h-8 gap-1.5 rounded-md px-3 text-xs font-semibold text-[#64748B] transition-colors duration-150 hover:text-[#0C4DA1] data-[state=active]:border data-[state=active]:border-[#E3EAF3] data-[state=active]:bg-white data-[state=active]:text-[#0C4DA1] data-[state=active]:shadow-sm dark:data-[state=active]:border-[#2C3B50] dark:data-[state=active]:bg-[#151F30] dark:data-[state=active]:text-[#70ADFF]"
            >
              <Package className="h-3.5 w-3.5" />
              Product stock
            </TabsTrigger>
            <TabsTrigger
              value="batches"
              className="h-8 gap-1.5 rounded-md px-3 text-xs font-semibold text-[#64748B] transition-colors duration-150 hover:text-[#0C4DA1] data-[state=active]:border data-[state=active]:border-[#E3EAF3] data-[state=active]:bg-white data-[state=active]:text-[#0C4DA1] data-[state=active]:shadow-sm dark:data-[state=active]:border-[#2C3B50] dark:data-[state=active]:bg-[#151F30] dark:data-[state=active]:text-[#70ADFF]"
            >
              <Layers className="h-3.5 w-3.5" />
              Batchwise stock
            </TabsTrigger>
          </TabsList>

          <div className="ml-auto flex shrink-0 items-center gap-2">
          {activeTab === "products" ? (
            <>
              <StockMetricCard label="Total products" value={productMetrics.totalProducts} icon={Package} accent="blue" />
              <StockMetricCard
                label="Total available units"
                value={productMetrics.totalQuantity.toLocaleString()}
                icon={ClipboardList}
                accent="green"
              />
              <StockMetricCard
                label="Products with holds"
                value={productMetrics.restricted}
                icon={AlertCircle}
                accent="amber"
              />
            </>
          ) : (
            <>
              <StockMetricCard label="Total batches" value={totalBatches} icon={Package} accent="blue" />
              <StockMetricCard
                label="Available quantity"
                value={totalQuantity.toLocaleString()}
                icon={ClipboardList}
                accent="green"
              />
              <StockMetricCard
                label="Restricted / hold batches"
                value={restrictedCount}
                icon={AlertCircle}
                accent="amber"
              />
            </>
          )}
          </div>
        </div>

        <TabsContent value="products" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <DataTable
            className="min-h-0 flex-1"
            title="Product stock"
            description="Aggregated availability across depots and batches."
            toolbarIcon={<Package className="h-4 w-4" aria-hidden />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search product code, name, or batch",
            }}
            toolbarFilters={stockFilters}
            data={sortedProductStock}
            columns={productColumns}
            sortKey={productSortKey}
            sortOrder={productSortOrder}
            onSort={handleProductSort}
            loading={loading}
            getRowId={(row) => row.id}
            resetPageKey={`${searchTerm}|${sourceFilter}|${statusFilter}|products`}
            emptyMessage="No product stock found. Approve a receive document to populate inventory."
          />
        </TabsContent>

        <TabsContent value="batches" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <DataTable
            className="min-h-0 flex-1"
            title="Batch-wise stock ledger"
            description="Approved receipts by batch, depot, and status."
            toolbarIcon={<Layers className="h-4 w-4" aria-hidden />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search product code, name, or batch",
            }}
            toolbarFilters={stockFilters}
            toolbarActions={
              <Button
                type="button"
                variant="ntPrimary"
                onClick={handleOpenCycleCount}
                disabled={filteredStock.length === 0}
              >
                Start Cycle Count
              </Button>
            }
            data={sortedBatchStock}
            columns={batchColumns}
            sortKey={batchSortKey}
            sortOrder={batchSortOrder}
            onSort={handleBatchSort}
            loading={loading}
            getRowId={(row) => row.id}
            resetPageKey={`${searchTerm}|${sourceFilter}|${statusFilter}|batches`}
            emptyMessage="No stock entries found. Approve a receive document to populate the ledger."
          />
        </TabsContent>

        <Dialog open={showCycleCount} onOpenChange={setShowCycleCount}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cycle Count</DialogTitle>
              <DialogDescription>Select a batch and enter the physical count.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Batch</label>
                <Select
                  value={selectedLedger ? String(selectedLedger.id) : undefined}
                  onValueChange={(value) => setSelectedLedgerId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStock.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.productName} — {item.batch || "No batch"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">System Quantity</label>
                <Input value={systemQuantity.toLocaleString()} disabled />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Physical Count</label>
                <Input
                  type="number"
                  placeholder="Enter counted quantity"
                  value={countQty}
                  onChange={(e) => setCountQty(e.target.value)}
                />
              </div>
              {countQty && discrepancy !== 0 && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm font-medium text-warning">
                    Discrepancy: {discrepancy > 0 ? `+${discrepancy}` : discrepancy} units
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ntSecondary" onClick={() => setShowCycleCount(false)}>
                Cancel
              </Button>
              <Button variant="ntPrimary" onClick={handleCycleCountSubmit}>
                Submit Count
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Tabs>
    </ThemeScope>
  );
}
