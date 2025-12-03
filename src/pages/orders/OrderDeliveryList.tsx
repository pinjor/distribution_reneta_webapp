import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, PlusCircle, Printer, Trash2, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";

interface OrderDeliverySummary {
  id: number;
  delivery_number: string;
  status: string;
  delivery_date: string;
  ship_to_party?: string;
  sold_to_party?: string;
  warehouse_no?: string;
  vehicle_info?: string;
  order_id: number;
  items: Array<{
    id: number;
    product_name: string;
    legacy_code?: string;
    new_code?: string;
    pack_size?: string;
    batch_number: string;
    expiry_date?: string;
    ordered_quantity: number;
    delivery_quantity: number;
    picked_quantity: number;
    available_stock: number;
    free_goods_threshold?: number;
    free_goods_quantity?: number;
    free_goods_awarded?: number;
    product_rate?: number;
    trade_amount?: number;
    vat_amount?: number;
  }>;
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Draft: "secondary",
  Packing: "outline",
  Loading: "outline",
  Shipped: "default",
  Delivered: "default",
};

const statusLabel = (status: string) => {
  if (status === "Draft") return "Pending";
  return status;
};

export default function OrderDeliveryList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deliveries, setDeliveries] = useState<OrderDeliverySummary[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [orderIdInput, setOrderIdInput] = useState("");

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const result = await apiEndpoints.orderDeliveries.getAll();
      setDeliveries(result.data || []);
    } catch (error) {
      console.error("Failed to load delivery orders", error);
      toast({ title: "Unable to load delivery orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const toggleRow = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateFromOrder = async () => {
    if (!orderIdInput) {
      toast({ title: "Enter an order ID or number", variant: "destructive" });
      return;
    }
    try {
      const response = await apiEndpoints.orderDeliveries.createFromOrder(orderIdInput);
      toast({ title: "Delivery Order created" });
      setShowCreateDialog(false);
      setOrderIdInput("");
      navigate(`/orders/delivery/${response.id}`);
      fetchDeliveries();
    } catch (error: any) {
      console.error("Delivery creation failed", error);
      toast({ title: "Unable to create delivery order", description: error?.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this delivery order?")) return;
    try {
      await apiEndpoints.orderDeliveries.delete(id);
      toast({ title: "Delivery Order deleted" });
      fetchDeliveries();
    } catch (error) {
      console.error("Failed to delete delivery order", error);
      toast({ title: "Unable to delete", variant: "destructive" });
    }
  };

  return (
    <main className="p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Delivery Order List</h1>
          <p className="text-muted-foreground">Monitor deliveries after order confirmation and manage batch allocations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchDeliveries} disabled={loading}>
            Refresh
          </Button>
          <Button variant="outline" onClick={() => navigate("/orders/picking")}>
            Packing Queue
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Create from Order
          </Button>
        </div>
      </header>

      {loading ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">Loading delivery orders...</CardContent>
        </Card>
      ) : deliveries.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No delivery orders yet. Create one from an approved order to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {deliveries.map((delivery) => {
            const isOpen = expanded[delivery.id];
            return (
              <Card key={delivery.id} className="overflow-hidden">
                <CardHeader className="bg-muted/60 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="h-8 w-8 rounded-full bg-background flex items-center justify-center border"
                      onClick={() => toggleRow(delivery.id)}
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        {delivery.delivery_number}
                        <Badge variant={statusVariant[delivery.status] || "secondary"}>{statusLabel(delivery.status)}</Badge>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Delivery Date: {delivery.delivery_date ? new Date(delivery.delivery_date).toLocaleDateString() : "—"} ·
                        Ship to: {delivery.ship_to_party || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vehicle: {delivery.vehicle_info || "Pending"} · Driver: {delivery.driver_name || "Pending"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/orders/delivery/${delivery.id}`)}>
                      Delivery
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/orders/delivery/${delivery.id}?print=1`)}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(delivery.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                {isOpen && (
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow className="text-xs uppercase text-muted-foreground">
                            <TableHead className="w-12">Itm</TableHead>
                            <TableHead>Material</TableHead>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Pack Size</TableHead>
                            <TableHead>Product Rate</TableHead>
                            <TableHead>Trade Amount</TableHead>
                            <TableHead>VAT Amount</TableHead>
                            <TableHead>Delivery Qty</TableHead>
                            <TableHead>Picked Qty</TableHead>
                            <TableHead>Batch</TableHead>
                            <TableHead>Expiry</TableHead>
                            <TableHead>Current Stock</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {delivery.items.map((item, idx) => (
                            <TableRow key={item.id} className="text-sm">
                              <TableCell>{String(idx + 1).padStart(2, "0")}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {item.legacy_code || item.new_code || "—"}
                              </TableCell>
                              <TableCell className="font-medium text-foreground">{item.product_name}</TableCell>
                              <TableCell>{item.pack_size || "—"}</TableCell>
                              <TableCell>{item.product_rate != null ? Number(item.product_rate).toLocaleString() : "—"}</TableCell>
                              <TableCell>{item.trade_amount != null ? Number(item.trade_amount).toLocaleString() : "—"}</TableCell>
                              <TableCell>{item.vat_amount != null ? Number(item.vat_amount).toLocaleString() : "—"}</TableCell>
                              <TableCell>{Number(item.delivery_quantity).toLocaleString()}</TableCell>
                              <TableCell>{Number(item.picked_quantity).toLocaleString()}</TableCell>
                              <TableCell>{item.batch_number}</TableCell>
                              <TableCell>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : "—"}</TableCell>
                              <TableCell>{Number(item.available_stock).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Delivery from Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="order-id">Order ID / Number</Label>
            <Input
              id="order-id"
              placeholder="Enter order ID or number"
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Provide the approved order identifier to generate a delivery using FEFO batch allocation.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFromOrder}>Create Delivery</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
