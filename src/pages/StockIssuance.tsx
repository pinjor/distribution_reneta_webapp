import { useState } from "react";
import { Package, Truck, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const pendingOrders = [
  { id: "ORD-001", customer: "Depot A", items: "Paracetamol 500mg", qty: 500, priority: "high" },
  { id: "ORD-002", customer: "Depot B", items: "Amoxicillin 250mg", qty: 300, priority: "normal" },
  { id: "ORD-003", customer: "Depot C", items: "Ibuprofen 400mg", qty: 200, priority: "normal" },
];

const batches = [
  { batch: "BTH-2024-001", expiry: "2025-12-15", qty: 1000, fefo: true },
  { batch: "BTH-2024-002", expiry: "2026-03-20", qty: 800, fefo: false },
];

export default function StockIssuance() {
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [loadedOrders, setLoadedOrders] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const handleLoadOrder = (orderId: string) => {
    setLoadedOrders([...loadedOrders, orderId]);
    toast({ title: "Order loaded", description: `${orderId} added to vehicle` });
  };

  const handleConfirmDispatch = () => {
    toast({ title: "Dispatch confirmed", description: "Delivery memo generated successfully" });
    setShowConfirmDialog(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Stock Issuance & Dispatch Planning</h1>
        <p className="text-muted-foreground">Manage order fulfillment with FEFO logic</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Pending Delivery Orders</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>{order.items}</TableCell>
                  <TableCell>{order.qty}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleLoadOrder(order.id)}
                      disabled={loadedOrders.includes(order.id)}
                    >
                      {loadedOrders.includes(order.id) ? "Loaded" : "Load"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Vehicle Loading Panel</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Vehicle</label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VH-001">TN-01-AB-1234 (5 Ton)</SelectItem>
                    <SelectItem value="VH-002">TN-02-CD-5678 (10 Ton)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Route</label>
                <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RT-001">Route A (North)</SelectItem>
                    <SelectItem value="RT-002">Route B (South)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Capacity Used</span>
                <span className="text-sm font-semibold">60%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: "60%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Loaded Orders</h3>
              {loadedOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders loaded yet</p>
              ) : (
                loadedOrders.map((orderId) => (
                  <div key={orderId} className="p-3 bg-success/10 border border-success/20 rounded-lg text-sm">
                    {orderId}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-warning mb-1">FEFO Alert</p>
                  <p className="text-muted-foreground">Batch BTH-2024-001 expires earliest (Dec 15, 2025)</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={() => setShowConfirmDialog(true)}>
                Generate Delivery Memo
              </Button>
              <Button variant="outline">Preview</Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Available Batches (FEFO View)</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch No.</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Available Qty</TableHead>
              <TableHead>FEFO Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((batch) => (
              <TableRow key={batch.batch}>
                <TableCell className="font-medium">{batch.batch}</TableCell>
                <TableCell>{batch.expiry}</TableCell>
                <TableCell>{batch.qty}</TableCell>
                <TableCell>
                  {batch.fefo ? (
                    <Badge className="bg-success/10 text-success border-success/20">Earliest Expiry</Badge>
                  ) : (
                    <Badge variant="outline">Later Expiry</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Dispatch</DialogTitle>
            <DialogDescription>Review dispatch details before confirming</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Vehicle</p>
                <p className="font-medium">TN-01-AB-1234</p>
              </div>
              <div>
                <p className="text-muted-foreground">Route</p>
                <p className="font-medium">Route A (North)</p>
              </div>
              <div>
                <p className="text-muted-foreground">Orders</p>
                <p className="font-medium">{loadedOrders.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Items</p>
                <p className="font-medium">1000 units</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmDispatch}>Confirm Dispatch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
