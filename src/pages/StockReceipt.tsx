import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  CheckCircle,
  Search,
  Printer,
  Eye,
  Package,
  ClipboardList,
  Warehouse,
  PlusCircle,
  PackagePlus,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { masterData, type ProductOption } from "@/lib/masterData";
import { KPICard } from "@/components/dashboard/KPICard";

const fieldClass =
  "border-[#D5E1F2] bg-white text-[#0B1B33] placeholder:text-[#8AA0BE] focus-visible:ring-[#0C4CA1]/30";

const StockReceipt = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [depots, setDepots] = useState<{ code: string; name: string }[]>([]);
  const { data: receiptsResponse, isLoading: receiptsLoading, isError: receiptsError, refetch } = useQuery({
    queryKey: ["stock-receipts"],
    queryFn: apiEndpoints.stockReceipts.getAll,
  });
  const receipts = (Array.isArray(receiptsResponse) ? receiptsResponse : []).map((row: any) => ({
    id: row.receipt_number || String(row.id),
    date: row.receipt_date,
    challan: row.challan_number || "—",
    product: "—",
    batch: "—",
    qty: Number(row.total_quantity || 0),
    source: row.status || "Completed",
  }));
  const { sortedData, sortKey, sortOrder, handleSort } = useTableSort(receipts, "date" as any);
  const { filteredData, searchTerm, setSearchTerm } = useTableFilter(sortedData);
  const totalQty = receipts.reduce((sum, row) => sum + row.qty, 0);

  useEffect(() => {
    document.title = "Stock Receipt | Renata";
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const [productData, depotData] = await Promise.all([masterData.getProducts(), masterData.getDepots()]);
        setProducts(productData);
        setDepots(depotData);
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
    toast.error("Oracle EBS challan verification is not connected. Use Receive from Factory to record inbound stock.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.error("This page cannot persist a warehouse receipt. Use Receive from Factory, which writes product_receipts.");
    navigate("/receive/factory");
  };

  const formatCount = (value: number) => {
    if (receiptsError && receiptsLoading === false && receipts.length === 0) return "—";
    if (receiptsLoading) return "...";
    return value.toLocaleString();
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
          <Button variant="ghost" size="sm" className="text-[#0C4CA1] hover:bg-[#E7EEF8] hover:text-[#08357A]">
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button variant="ghost" size="sm" className="text-[#0C4CA1] hover:bg-[#E7EEF8] hover:text-[#08357A]">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          className="bg-[#0C4CA1] text-white hover:bg-[#08357A]"
          onClick={() => navigate("/receive/factory")}
        >
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Receive from Factory
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-[#0C4CA1] bg-white text-[#0C4CA1] hover:bg-[#E7EEF8] hover:text-[#08357A]"
          onClick={() => navigate("/receive/list")}
        >
          <ClipboardList className="h-4 w-4 mr-1.5" />
          All Receipts
        </Button>
      </div>

      {receiptsError && (
        <Card className="flex items-center justify-between border-destructive/40 p-4">
          <p className="text-sm text-destructive">Stock receipts could not be loaded. Counts below are not live.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Receipts"
          value={formatCount(receipts.length)}
          icon={Package}
          description="Records in stock receipts"
          index={0}
        />
        <KPICard
          title="Units received"
          value={formatCount(totalQty)}
          icon={PackagePlus}
          description="Sum of listed quantities"
          index={1}
        />
        <KPICard
          title="Products"
          value={loadingProducts ? "..." : products.length.toLocaleString()}
          icon={Warehouse}
          description="Catalog items available to receive"
          index={2}
        />
        <KPICard
          title="Depots"
          value={loadingProducts ? "..." : depots.length.toLocaleString()}
          icon={ClipboardList}
          description="Source depots from the API"
          index={3}
        />
      </div>

      <Card className="card-elevated overflow-hidden border border-[#D5E1F2] bg-white shadow-[0_16px_40px_-28px_rgba(12,76,161,0.45)]">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0C4CA1] text-white shadow-[0_8px_16px_-10px_rgba(12,76,161,0.9)]">
              <PackagePlus className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[#0C4CA1]">Record inbound stock</span>
              <span className="text-sm font-normal text-[#2C4A73]">
                Confirming here opens Receive from Factory, which is the path that persists receipts.
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4 rounded-2xl border border-[#D5E1F2] bg-[#F7FAFE] p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0B1B33]">
                EBS challan verification
                <span className="text-xs font-normal text-[#2C4A73]">EBS is not integrated</span>
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="challanNo" className="text-[#2C4A73]">Challan Number *</Label>
                  <div className="flex gap-2">
                    <Input id="challanNo" placeholder="Enter challan number" className={`flex-1 ${fieldClass}`} required />
                    <Button
                      type="button"
                      onClick={handleChallanVerify}
                      variant="outline"
                      disabled
                      className="border-[#D5E1F2] text-[#8AA0BE]"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Verify
                    </Button>
                  </div>
                </div>
                <p className="self-end text-xs text-[#2C4A73] sm:col-span-2">
                  Inbound receipts that persist are created under Receive from Factory.
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product" className="text-[#2C4A73]">Product Name *</Label>
                <Select required value={selectedProduct} onValueChange={setSelectedProduct} disabled={loadingProducts}>
                  <SelectTrigger id="product" className={fieldClass}>
                    <SelectValue placeholder={loadingProducts ? "Loading products..." : "Select product"} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.length === 0 ? (
                      <SelectItem value="no-products" disabled>
                        {loadingProducts ? "Loading..." : "No products available"}
                      </SelectItem>
                    ) : (
                      products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.oldCode} — {product.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch" className="text-[#2C4A73]">Batch Number * (Numeric Only)</Label>
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
                <p className="text-xs text-[#2C4A73]">Only numeric batch numbers are allowed (e.g., 12345)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qty" className="text-[#2C4A73]">Quantity *</Label>
                <Input id="qty" type="number" placeholder="0" required min="1" className={fieldClass} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitPrice" className="text-[#2C4A73]">Unit Price *</Label>
                <Input id="unitPrice" type="number" step="0.01" placeholder="0.00" required min="0" className={fieldClass} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfgDate" className="text-[#2C4A73]">Manufacturing Date *</Label>
                <Input id="mfgDate" type="date" required className={fieldClass} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expDate" className="text-[#2C4A73]">Expiry Date *</Label>
                <Input id="expDate" type="date" required className={fieldClass} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storage" className="text-[#2C4A73]">Storage Condition *</Label>
                <Select required>
                  <SelectTrigger id="storage" className={fieldClass}>
                    <SelectValue placeholder="Select storage type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambient">Ambient (15-25°C)</SelectItem>
                    <SelectItem value="cool">Cool (8-15°C)</SelectItem>
                    <SelectItem value="cold">Cold (2-8°C)</SelectItem>
                    <SelectItem value="frozen">Frozen (-20°C)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source" className="text-[#2C4A73]">Source Depot *</Label>
                <Select required>
                  <SelectTrigger id="source" className={fieldClass}>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {depots.length === 0 ? (
                      <SelectItem value="none" disabled>No depots from API</SelectItem>
                    ) : (
                      depots.map((depot) => (
                        <SelectItem key={depot.code} value={depot.code}>
                          {depot.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="border-[#0C4CA1] bg-white text-[#0C4CA1] hover:bg-[#E7EEF8] hover:text-[#08357A]"
                onClick={() => navigate("/warehouse/maintenance")}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-[#0C4CA1] text-white hover:bg-[#08357A]">
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm Receipt
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="card-elevated overflow-hidden border border-[#D5E1F2] bg-white shadow-[0_16px_40px_-28px_rgba(12,76,161,0.45)]">
        <CardHeader className="pb-4">
          <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-lg font-semibold">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0C4CA1] text-white shadow-[0_8px_16px_-10px_rgba(12,76,161,0.9)]">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-[#0C4CA1]">Recent receipts</span>
                <span className="text-sm font-normal text-[#2C4A73]">Live list from the stock receipts API</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search receipts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-64 ${fieldClass}`}
              />
              <Button
                variant="outline"
                size="sm"
                className="border-[#0C4CA1] bg-white text-[#0C4CA1] hover:bg-[#E7EEF8] hover:text-[#08357A]"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Report
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredData}
            columns={columns}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            emptyMessage={receiptsError ? "Could not load receipts" : receiptsLoading ? "Loading…" : "No stock receipts in the database"}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default StockReceipt;
