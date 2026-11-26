import { useState, useEffect } from "react";
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
import { CheckCircle, Search, Printer, Eye, Package } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { masterData, type ProductOption } from "@/lib/masterData";
import { PageHeader } from "@/components/layout/PageHeader";

const StockReceipt = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [depots, setDepots] = useState<{ code: string; name: string }[]>([]);
  const { data: receiptsResponse, isLoading: receiptsLoading, isError: receiptsError } = useQuery({
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
          <Button variant="ghost" size="sm" className="hover-scale">
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button variant="ghost" size="sm" className="hover-scale">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Stock Receipt"
        subtitle="Record incoming stock from suppliers"
        icon={Package}
        variant="blue"
      />

      <Card className="p-6 card-elevated">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Challan Verification */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              EBS Challan Verification
              <span className="text-xs font-normal text-muted-foreground">EBS is not integrated</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="challanNo">Challan Number *</Label>
                <div className="flex gap-2">
                  <Input
                    id="challanNo"
                    placeholder="Enter challan number"
                    className="flex-1"
                    required
                  />
                  <Button
                    type="button"
                    onClick={handleChallanVerify}
                    variant="outline"
                    disabled
                    className="hover-scale"
                  >
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Verify
                    </>
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground col-span-2">
                Inbound receipts that persist are created under Receive from Factory.
              </p>
            </div>
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="product">Product Name *</Label>
              <Select 
                required 
                value={selectedProduct} 
                onValueChange={setSelectedProduct}
                disabled={loadingProducts}
              >
                <SelectTrigger id="product">
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
              <Label htmlFor="batch">Batch Number * (Numeric Only)</Label>
              <Input 
                id="batch" 
                placeholder="Enter batch number (digits only)" 
                required 
                pattern="[0-9]+"
                title="Batch number must contain only digits"
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numeric input
                  if (value && !/^\d+$/.test(value)) {
                    e.target.setCustomValidity("Batch number must be numeric only (digits only)");
                  } else {
                    e.target.setCustomValidity("");
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">Only numeric batch numbers are allowed (e.g., 12345)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty">Quantity *</Label>
              <Input id="qty" type="number" placeholder="0" required min="1" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price *</Label>
              <Input id="unitPrice" type="number" step="0.01" placeholder="0.00" required min="0" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mfgDate">Manufacturing Date *</Label>
              <Input id="mfgDate" type="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expDate">Expiry Date *</Label>
              <Input id="expDate" type="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage">Storage Condition *</Label>
              <Select required>
                <SelectTrigger id="storage">
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
              <Label htmlFor="source">Source Depot *</Label>
              <Select required>
                <SelectTrigger id="source">
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

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" className="hover-scale">
              Cancel
            </Button>
            <Button type="submit" className="hover-scale">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Receipt
            </Button>
          </div>
        </form>
      </Card>

      {/* Receipt History */}
      <Card className="p-6 card-elevated">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Recent Receipts</h3>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search receipts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Button variant="outline" size="sm" className="hover-scale">
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
          emptyMessage={receiptsError ? "Could not load receipts" : receiptsLoading ? "Loading…" : "No stock receipts in the database"}
        />
      </Card>
    </div>
  );
};

export default StockReceipt;
