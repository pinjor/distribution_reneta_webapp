import { useEffect, useMemo, useState } from "react";
import { Package, ClipboardList, AlertCircle, Layers, Warehouse } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { masterData, type ProductOption } from "@/lib/masterData";
import { KPICard } from "@/components/dashboard/KPICard";

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

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

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
            .filter((item: any) => {
              // Filter to only show products from master data (new medicine products)
              const productId = item.product_id || item.product?.id;
              const masterProduct = productsData.find((p: ProductOption) => p.id === String(productId));
              return masterProduct !== undefined; // Only include products that exist in master data
            })
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

  const systemQuantity = selectedLedger ? selectedLedger.availableQuantity : 0;
  const discrepancy = countQty ? Number(countQty || 0) - systemQuantity : 0;
  const uniqueDepots = useMemo(() => {
    const names = new Set(filteredStock.map((item) => item.depotName).filter(Boolean));
    return names.size;
  }, [filteredStock]);
  const formatMetric = (value: number) => (loading ? "..." : value.toLocaleString());
  const fieldClass =
    "border-[#D5E1F2] bg-white text-[#0B1B33] placeholder:text-[#8AA0BE] focus-visible:ring-[#0C4CA1]/30";

  useEffect(() => {
    document.title = "Stock Management | Renata";
  }, []);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as "products" | "batches")}
      className="space-y-6"
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {activeTab === "products" ? (
            <>
              <KPICard
                title="Total products"
                value={formatMetric(productMetrics.totalProducts)}
                icon={Package}
                description="Catalog products in this view"
                index={0}
              />
              <KPICard
                title="Available units"
                value={formatMetric(productMetrics.totalQuantity)}
                icon={ClipboardList}
                description="Sum of on-hand quantity"
                index={1}
              />
              <KPICard
                title="Products with holds"
                value={formatMetric(productMetrics.restricted)}
                icon={AlertCircle}
                description="SKUs with restricted batches"
                index={2}
              />
              <KPICard
                title="Depots"
                value={formatMetric(uniqueDepots)}
                icon={Warehouse}
                description="Depots in the current filter"
                index={3}
              />
            </>
          ) : (
            <>
              <KPICard
                title="Total batches"
                value={formatMetric(totalBatches)}
                icon={Package}
                description="Ledger rows after filters"
                index={0}
              />
              <KPICard
                title="Available quantity"
                value={formatMetric(totalQuantity)}
                icon={ClipboardList}
                description="Units on listed batches"
                index={1}
              />
              <KPICard
                title="Restricted / hold"
                value={formatMetric(restrictedCount)}
                icon={AlertCircle}
                description="Batches not unrestricted"
                index={2}
              />
              <KPICard
                title="Depots"
                value={formatMetric(uniqueDepots)}
                icon={Warehouse}
                description="Depots in the current filter"
                index={3}
              />
            </>
          )}
        </div>

        <Card className="card-elevated overflow-hidden border border-[#D5E1F2] bg-white shadow-[0_16px_40px_-28px_rgba(12,76,161,0.45)]">
          <CardHeader className="pb-4">
            <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-lg font-semibold">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0C4CA1] text-white shadow-[0_8px_16px_-10px_rgba(12,76,161,0.9)]">
                  {activeTab === "products" ? <Package className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                </div>
                <div>
                  <span className="block text-[#0C4CA1]">
                    {activeTab === "products" ? "Product stock" : "Batch-wise stock ledger"}
                  </span>
                  <span className="text-sm font-normal text-[#2C4A73]">
                    {activeTab === "products"
                      ? "Product-level availability across depots and batches."
                      : "Batch-wise inventory reflecting approved receipts."}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TabsList className="h-9 rounded-md border border-[#D5E1F2] bg-white p-0.5 shadow-none">
                  <TabsTrigger
                    value="products"
                    className="h-8 gap-1.5 rounded-md px-3 text-[#0C4CA1] data-[state=active]:bg-[#0C4CA1] data-[state=active]:text-white data-[state=active]:shadow-none"
                  >
                    <Package className="h-4 w-4" />
                    Product stock
                  </TabsTrigger>
                  <TabsTrigger
                    value="batches"
                    className="h-8 gap-1.5 rounded-md px-3 text-[#0C4CA1] data-[state=active]:bg-[#0C4CA1] data-[state=active]:text-white data-[state=active]:shadow-none"
                  >
                    <Layers className="h-4 w-4" />
                    Batchwise stock
                  </TabsTrigger>
                </TabsList>
                {activeTab === "batches" ? (
                  <Button
                    size="sm"
                    className="bg-[#0C4CA1] text-white hover:bg-[#08357A]"
                    onClick={handleOpenCycleCount}
                    disabled={filteredStock.length === 0}
                  >
                    Start Cycle Count
                  </Button>
                ) : null}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
          <div className="mb-4 flex flex-wrap gap-4">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className={`w-[200px] ${fieldClass}`}>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="FACTORY">Factory receipts</SelectItem>
                <SelectItem value="DEPOT">Depot transfers</SelectItem>
                <SelectItem value="RETURN">Stock returns</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={`w-[200px] ${fieldClass}`}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="UNRESTRICTED">Unrestricted</SelectItem>
                <SelectItem value="RESTRICTED">Restricted</SelectItem>
                <SelectItem value="HOLD">Hold</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className={`w-[260px] ${fieldClass}`}
              placeholder="Search product code, name, or batch"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <TabsContent value="products" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU / Code</TableHead>
                  <TableHead>Total quantity</TableHead>
                  <TableHead>Batches</TableHead>
                  <TableHead>Depots</TableHead>
                  <TableHead>Restricted</TableHead>
                  <TableHead>Earliest expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                      Loading stock data...
                    </TableCell>
                  </TableRow>
                ) : productStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                      No product stock found. Approve a receive document to populate inventory.
                    </TableCell>
                  </TableRow>
                ) : (
                  productStock.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.productCode || "—"}</TableCell>
                      <TableCell>{item.totalQuantity.toLocaleString()}</TableCell>
                      <TableCell>{item.batches}</TableCell>
                      <TableCell>{item.depotCount}</TableCell>
                      <TableCell>
                        {item.restrictedBatches > 0 ? (
                          <Badge className="bg-warning/10 text-warning border-warning/20">{item.restrictedBatches}</Badge>
                        ) : (
                          <Badge variant="outline">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.earliestExpiry ? new Date(item.earliestExpiry).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="batches" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch No.</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                      Loading stock ledger...
                    </TableCell>
                  </TableRow>
                ) : filteredStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                      No stock entries found. Approve a receive document to populate the ledger.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStock.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{item.productName}</span>
                          {item.productCode ? (
                            <span className="text-xs text-muted-foreground">{item.productCode}</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{item.batch || "—"}</TableCell>
                      <TableCell>{item.depotName || "—"}</TableCell>
                      <TableCell>{item.availableQuantity.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.storageType || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        {(item.status || "").toLowerCase() === "unrestricted" ? (
                          <Badge className="bg-success/10 text-success border-success/20">Unrestricted</Badge>
                        ) : (
                          <Badge className="bg-warning/10 text-warning border-warning/20">{item.status || "Hold"}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCycleCount} onOpenChange={setShowCycleCount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cycle Count</DialogTitle>
            <DialogDescription>Select a batch and enter the physical count.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#2C4A73]">Select Batch</label>
              <Select
                value={selectedLedger ? String(selectedLedger.id) : undefined}
                onValueChange={(value) => setSelectedLedgerId(Number(value))}
              >
                <SelectTrigger className={fieldClass}>
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
              <label className="mb-2 block text-sm font-medium text-[#2C4A73]">System Quantity</label>
              <Input value={systemQuantity.toLocaleString()} disabled className={fieldClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#2C4A73]">Physical Count</label>
              <Input
                type="number"
                placeholder="Enter counted quantity"
                value={countQty}
                onChange={(e) => setCountQty(e.target.value)}
                className={fieldClass}
              />
            </div>
            {countQty && discrepancy !== 0 && (
              <div className="rounded-lg border border-warning/20 bg-warning/10 p-3">
                <p className="text-sm font-medium text-warning">
                  Discrepancy: {discrepancy > 0 ? `+${discrepancy}` : discrepancy} units
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-[#0C4CA1] bg-white text-[#0C4CA1] hover:bg-[#E7EEF8] hover:text-[#08357A]"
              onClick={() => setShowCycleCount(false)}
            >
              Cancel
            </Button>
            <Button className="bg-[#0C4CA1] text-white hover:bg-[#08357A]" onClick={handleCycleCountSubmit}>
              Submit Count
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
