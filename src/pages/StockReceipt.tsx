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
import { CheckCircle, Search } from "lucide-react";
import { toast } from "sonner";

const StockReceipt = () => {
  const [challanVerified, setChallanVerified] = useState(false);

  const handleChallanVerify = () => {
    // Simulate EBS verification
    setTimeout(() => {
      setChallanVerified(true);
      toast.success("Challan verified successfully from Oracle EBS");
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Stock Receipt</h1>
        <p className="text-muted-foreground">Record incoming stock from suppliers</p>
      </div>

      <Card className="p-6 card-elevated">
        <form className="space-y-6">
          {/* Challan Verification */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              EBS Challan Verification
              {challanVerified && <CheckCircle className="h-5 w-5 text-success" />}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="challanNo">Challan Number *</Label>
                <div className="flex gap-2">
                  <Input
                    id="challanNo"
                    placeholder="Enter challan number"
                    className="flex-1"
                  />
                  <Button type="button" onClick={handleChallanVerify} variant="outline">
                    <Search className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                </div>
              </div>
              {challanVerified && (
                <div className="flex items-end">
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
              <Select>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="para">Paracetamol 500mg</SelectItem>
                  <SelectItem value="amox">Amoxicillin 250mg</SelectItem>
                  <SelectItem value="ibu">Ibuprofen 400mg</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch">Batch Number *</Label>
              <Input id="batch" placeholder="Enter batch number" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty">Quantity *</Label>
              <Input id="qty" type="number" placeholder="0" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price *</Label>
              <Input id="unitPrice" type="number" step="0.01" placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mfgDate">Manufacturing Date *</Label>
              <Input id="mfgDate" type="date" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expDate">Expiry Date *</Label>
              <Input id="expDate" type="date" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage">Storage Condition *</Label>
              <Select>
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
              <Select>
                <SelectTrigger id="source">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="central">Central Depot</SelectItem>
                  <SelectItem value="north">North Depot</SelectItem>
                  <SelectItem value="south">South Depot</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Receipt
            </Button>
          </div>
        </form>
      </Card>

      {/* Receipt History */}
      <Card className="p-6 card-elevated">
        <h3 className="text-lg font-medium mb-4">Recent Receipts</h3>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left p-4 text-sm font-medium">Date</th>
                <th className="text-left p-4 text-sm font-medium">Challan No.</th>
                <th className="text-left p-4 text-sm font-medium">Product</th>
                <th className="text-left p-4 text-sm font-medium">Batch</th>
                <th className="text-left p-4 text-sm font-medium">Quantity</th>
                <th className="text-left p-4 text-sm font-medium">Source</th>
                <th className="text-right p-4 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  date: "2025-01-08",
                  challan: "CH-2025-001",
                  product: "Paracetamol 500mg",
                  batch: "PCM2024-11",
                  qty: 5000,
                  source: "Central Depot",
                },
                {
                  date: "2025-01-07",
                  challan: "CH-2025-002",
                  product: "Amoxicillin 250mg",
                  batch: "AMX2024-08",
                  qty: 3000,
                  source: "North Depot",
                },
              ].map((receipt, index) => (
                <tr key={index} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-muted-foreground">{receipt.date}</td>
                  <td className="p-4 text-sm font-medium">{receipt.challan}</td>
                  <td className="p-4 text-sm">{receipt.product}</td>
                  <td className="p-4 text-sm">{receipt.batch}</td>
                  <td className="p-4 text-sm">{receipt.qty.toLocaleString()}</td>
                  <td className="p-4 text-sm">{receipt.source}</td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default StockReceipt;
