import { useState } from "react";
import { Package, Thermometer, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const stockData = [
  { product: "Paracetamol 500mg", batch: "BTH-2024-001", qty: 1000, storage: "Ambient", status: "Unrestricted", expiry: "2025-12-15" },
  { product: "Insulin Vials", batch: "BTH-2024-002", qty: 500, storage: "Cold", status: "Unrestricted", expiry: "2025-08-20" },
  { product: "Amoxicillin 250mg", batch: "BTH-2024-003", qty: 300, storage: "Cool", status: "Restricted", expiry: "2026-01-10" },
];

export default function StockMaintenance() {
  const [storageFilter, setStorageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCycleCount, setShowCycleCount] = useState(false);
  const [countQty, setCountQty] = useState("");
  const { toast } = useToast();

  const handleCycleCountSubmit = () => {
    toast({ title: "Cycle count recorded", description: "Stock discrepancy logged for review" });
    setShowCycleCount(false);
    setCountQty("");
  };

  const filteredStock = stockData.filter(item => {
    if (storageFilter !== "all" && item.storage !== storageFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Stock Maintenance</h1>
        <p className="text-muted-foreground">Manage batch-wise inventory and cycle counts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Batches</p>
              <p className="text-2xl font-semibold">24</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
              <Thermometer className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cold Storage</p>
              <p className="text-2xl font-semibold">8</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Restricted</p>
              <p className="text-2xl font-semibold">3</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Batch-wise Stock Ledger</h2>
          <Button onClick={() => setShowCycleCount(true)}>Start Cycle Count</Button>
        </div>

        <div className="flex gap-4 mb-4">
          <Select value={storageFilter} onValueChange={setStorageFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Storage Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Storage</SelectItem>
              <SelectItem value="Ambient">Ambient</SelectItem>
              <SelectItem value="Cool">Cool (2-8°C)</SelectItem>
              <SelectItem value="Cold">Cold (-20°C)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Unrestricted">Unrestricted</SelectItem>
              <SelectItem value="Restricted">Restricted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Batch No.</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Storage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiry</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStock.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{item.product}</TableCell>
                <TableCell>{item.batch}</TableCell>
                <TableCell>{item.qty}</TableCell>
                <TableCell>
                  <Badge variant="outline">{item.storage}</Badge>
                </TableCell>
                <TableCell>
                  {item.status === "Unrestricted" ? (
                    <Badge className="bg-success/10 text-success border-success/20">Unrestricted</Badge>
                  ) : (
                    <Badge className="bg-warning/10 text-warning border-warning/20">Restricted</Badge>
                  )}
                </TableCell>
                <TableCell>{item.expiry}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showCycleCount} onOpenChange={setShowCycleCount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cycle Count</DialogTitle>
            <DialogDescription>Enter physical count for verification</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Product</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose product" />
                </SelectTrigger>
                <SelectContent>
                  {stockData.map((item, idx) => (
                    <SelectItem key={idx} value={item.batch}>
                      {item.product} - {item.batch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">System Quantity</label>
              <Input value="1000" disabled />
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
            {countQty && parseInt(countQty) !== 1000 && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm font-medium text-warning">
                  Discrepancy: {parseInt(countQty) - 1000} units
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCycleCount(false)}>Cancel</Button>
            <Button onClick={handleCycleCountSubmit}>Submit Count</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
