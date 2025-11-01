import { useState } from "react";
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
import { CheckCircle, Search, Printer, Eye } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { recentReceipts } from "@/lib/mockData";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";

const StockReceipt = () => {
  const [challanVerified, setChallanVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { sortedData, sortKey, sortOrder, handleSort } = useTableSort(recentReceipts, "date" as any);
  const { filteredData, searchTerm, setSearchTerm } = useTableFilter(sortedData);

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
      <div>
        <h1 className="text-3xl font-semibold mb-2">Stock Receipt</h1>
        <p className="text-muted-foreground">Record incoming stock from suppliers</p>
      </div>

      <Card className="p-6 card-elevated">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Challan Verification */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              EBS Challan Verification
              {challanVerified && <CheckCircle className="h-5 w-5 text-success animate-scale-in" />}
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
                    disabled={verifying || challanVerified}
                    className="hover-scale"
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
                </div>
              </div>
              {challanVerified && (
                <div className="flex items-end animate-fade-in">
                  <div className="px-4 py-2 bg-success-bg text-success rounded-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Verified from Oracle EBS</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="product">Product Name *</Label>
              <Select required>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="para">Paracetamol 500mg</SelectItem>
                  <SelectItem value="amox">Amoxicillin 250mg</SelectItem>
                  <SelectItem value="ibu">Ibuprofen 400mg</SelectItem>
                  <SelectItem value="cet">Cetirizine 10mg</SelectItem>
                  <SelectItem value="met">Metformin 500mg</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch">Batch Number *</Label>
              <Input id="batch" placeholder="Enter batch number" required />
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
                  <SelectItem value="mumbai">Mumbai Central</SelectItem>
                  <SelectItem value="delhi">Delhi Main</SelectItem>
                  <SelectItem value="bangalore">Bangalore Hub</SelectItem>
                  <SelectItem value="chennai">Chennai Depot</SelectItem>
                  <SelectItem value="hyderabad">Hyderabad Warehouse</SelectItem>
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
          emptyMessage="No recent receipts found"
        />
      </Card>
    </div>
  );
};

export default StockReceipt;
