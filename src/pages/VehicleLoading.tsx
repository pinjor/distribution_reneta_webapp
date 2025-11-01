import { useState } from "react";
import { Truck, Package, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const availableOrders = [
  { id: "ORD-001", customer: "Depot A", items: "Paracetamol 500mg", qty: 500, weight: 25 },
  { id: "ORD-002", customer: "Depot B", items: "Amoxicillin 250mg", qty: 300, weight: 15 },
  { id: "ORD-003", customer: "Depot C", items: "Ibuprofen 400mg", qty: 200, weight: 10 },
];

const vehicles = [
  { id: "VH-001", number: "TN-01-AB-1234", capacity: 5000, type: "5 Ton" },
  { id: "VH-002", number: "TN-02-CD-5678", capacity: 10000, type: "10 Ton" },
  { id: "VH-003", number: "TN-03-EF-9012", capacity: 7500, type: "7.5 Ton" },
];

export default function VehicleLoading() {
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [loadedOrders, setLoadedOrders] = useState<typeof availableOrders>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const totalWeight = loadedOrders.reduce((sum, order) => sum + order.weight, 0);
  const selectedVehicleData = vehicles.find((v) => v.id === selectedVehicle);
  const capacityPercentage = selectedVehicleData
    ? Math.round((totalWeight / selectedVehicleData.capacity) * 100)
    : 0;

  const handleLoadOrder = (order: typeof availableOrders[0]) => {
    if (loadedOrders.find((o) => o.id === order.id)) {
      toast({ title: "Already loaded", description: "This order is already in the vehicle" });
      return;
    }

    if (selectedVehicleData && totalWeight + order.weight > selectedVehicleData.capacity) {
      toast({
        title: "Capacity exceeded",
        description: "This order would exceed vehicle capacity",
        variant: "destructive",
      });
      return;
    }

    setLoadedOrders([...loadedOrders, order]);
    toast({ title: "Order loaded", description: `${order.id} added to vehicle` });
  };

  const handleRemoveOrder = (orderId: string) => {
    setLoadedOrders(loadedOrders.filter((o) => o.id !== orderId));
    toast({ title: "Order removed", description: `${orderId} removed from vehicle` });
  };

  const handleConfirmDispatch = () => {
    toast({
      title: "Dispatch confirmed",
      description: "Delivery memo generated successfully",
    });
    setShowConfirmDialog(false);
    setLoadedOrders([]);
    setSelectedVehicle("");
    setSelectedRoute("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Vehicle Loading Panel</h1>
        <p className="text-muted-foreground">Load orders onto vehicles for dispatch</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Available Orders</h2>
          </div>

          <div className="space-y-3">
            {availableOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-medium">{order.id}</p>
                  <p className="text-sm text-muted-foreground">{order.customer}</p>
                  <p className="text-sm">{order.items}</p>
                  <div className="flex gap-2 text-sm">
                    <Badge variant="outline">Qty: {order.qty}</Badge>
                    <Badge variant="outline">Weight: {order.weight}kg</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleLoadOrder(order)}
                  disabled={!selectedVehicle || loadedOrders.some((o) => o.id === order.id)}
                >
                  {loadedOrders.some((o) => o.id === order.id) ? "Loaded" : "Load"}
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Vehicle Details</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Vehicle</label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.number} ({vehicle.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select Route</label>
              <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose route" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RT-001">Route A (North)</SelectItem>
                  <SelectItem value="RT-002">Route B (South)</SelectItem>
                  <SelectItem value="RT-003">Route C (East)</SelectItem>
                  <SelectItem value="RT-004">Route D (West)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedVehicleData && (
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Capacity Used</span>
                    <span className="text-sm font-semibold">{capacityPercentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        capacityPercentage > 90 ? "bg-destructive" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Capacity:</span>
                    <span className="font-medium">{selectedVehicleData.capacity}kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Load:</span>
                    <span className="font-medium">{totalWeight}kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-medium">
                      {selectedVehicleData.capacity - totalWeight}kg
                    </span>
                  </div>
                </div>
              </div>
            )}

            {capacityPercentage > 90 && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-warning">
                    Vehicle capacity almost full!
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Loaded Orders ({loadedOrders.length})</h3>
              {loadedOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders loaded yet</p>
              ) : (
                <div className="space-y-2">
                  {loadedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-2 bg-success/10 border border-success/20 rounded-lg text-sm flex items-center justify-between"
                    >
                      <span className="font-medium">{order.id}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveOrder(order.id)}
                        className="h-6 px-2"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={() => setShowConfirmDialog(true)}
              disabled={!selectedVehicle || !selectedRoute || loadedOrders.length === 0}
            >
              Generate Delivery Memo
            </Button>
          </div>
        </Card>
      </div>

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
                <p className="font-medium">
                  {selectedVehicleData?.number} ({selectedVehicleData?.type})
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Route</p>
                <p className="font-medium">
                  {selectedRoute === "RT-001" && "Route A (North)"}
                  {selectedRoute === "RT-002" && "Route B (South)"}
                  {selectedRoute === "RT-003" && "Route C (East)"}
                  {selectedRoute === "RT-004" && "Route D (West)"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Orders</p>
                <p className="font-medium">{loadedOrders.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Weight</p>
                <p className="font-medium">{totalWeight}kg</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmDispatch}>Confirm Dispatch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
