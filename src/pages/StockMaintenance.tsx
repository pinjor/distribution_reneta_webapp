import { useEffect, useMemo, useState } from "react";
import { Package, ClipboardList, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";

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

  useEffect(() => {
    let active = true;
    const loadLedger = async () => {
      setLoading(true);
      try {
        const data = await apiEndpoints.stockMaintenance.getLedger();
        if (!active) return;
        if (Array.isArray(data)) {
          const mapped: StockLedgerRow[] = data.map((item: any) => ({
            id: Number(item.id ?? Math.random()),
            productName:
              item.product?.name ?? item.product_name ?? item.product_label ?? item.product_code ?? "Unknown product",
            productCode:
              item.product?.code ?? item.product_code ?? item.product_id ? String(item.product_id) : undefined,
            depotName: item.depot?.name ?? item.depot_name ?? "",
            batch: item.batch ?? item.batch_number ?? "",
            storageType: item.storage_type ?? item.source_type ?? "",
            status: item.status ?? "Unrestricted",
            expiryDate: item.expiry_date ?? item.expiry ?? "",
            quantity: toNumber(item.quantity ?? item.available_quantity ?? 0),
            availableQuantity: toNumber(item.available_quantity ?? item.quantity ?? 0),
          }));
          setLedger(mapped);
        } else {
          setLedger([]);
        }
      } catch (error) {
        console.error("Failed to load stock ledger", error);
        toast({ title: "Unable to load stock ledger", variant: "destructive" });
        setLedger([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadLedger();
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
  }, [filteredStock]);

  const productMetrics = useMemo(() => {
    const totalProducts = productStock.length;
    const totalQuantity = productStock.reduce((sum, row) => sum + row.totalQuantity, 0);
    const restricted = productStock.filter((row) => row.restrictedBatches > 0).length;
    return { totalProducts, totalQuantity, restricted };
  }, [productStock]);

  const systemQuantity = selectedLedger ? selectedLedger.availableQuantity : 0;
  const discrepancy = countQty ? Number(countQty || 0) - systemQuantity : 0;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as "products" | "batches")}
      className="space-y-6"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Stock Maintenance</h1>
            <p className="text-muted-foreground">
              {activeTab === "products"
                ? "Product-level availability across all depots and batches."
                : "Batch-wise inventory reflecting approved receipts."}
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="products">Product stock</TabsTrigger>
            <TabsTrigger value="batches">Batchwise stock</TabsTrigger>
          </TabsList>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeTab === "products" ? (
            <>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total products</p>
                    <p className="text-2xl font-semibold">{productMetrics.totalProducts}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <ClipboardList className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total available units</p>
                    <p className="text-2xl font-semibold">{productMetrics.totalQuantity.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Products with holds</p>
                    <p className="text-2xl font-semibold">{productMetrics.restricted}</p>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total batches</p>
                    <p className="text-2xl font-semibold">{totalBatches}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <ClipboardList className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Available quantity</p>
                    <p className="text-2xl font-semibold">{totalQuantity.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Restricted / hold batches</p>
                    <p className="text-2xl font-semibold">{restrictedCount}</p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {activeTab === "products" ? "Product stock" : "Batch-wise stock ledger"}
            </h2>
            {activeTab === "batches" ? (
              <Button onClick={handleOpenCycleCount} disabled={filteredStock.length === 0}>
                Start Cycle Count
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-4 mb-4">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[200px]">
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
              <SelectTrigger className="w-[200px]">
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
              className="w-[260px]"
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
            <Button variant="outline" onClick={() => setShowCycleCount(false)}>
              Cancel
            </Button>
            <Button onClick={handleCycleCountSubmit}>Submit Count</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
