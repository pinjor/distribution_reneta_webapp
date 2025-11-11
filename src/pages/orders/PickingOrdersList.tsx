import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { Loader2, PlusCircle, Printer, Eye, CheckCircle2, RefreshCw } from "lucide-react";

interface PickingOrderSummary {
  id: number;
  order_number: string;
  loading_no?: string;
  loading_date?: string;
  vehicle_no?: string;
  delivery_by?: string;
  area?: string;
  status: string;
  deliveries: Array<any>;
  created_at?: string;
}

const STATUS_VARIANT: Record<string, "secondary" | "default" | "outline"> = {
  Draft: "secondary",
  Approved: "default",
};

export default function PickingOrdersList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<PickingOrderSummary[]>([]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await apiEndpoints.pickingOrders.getAll();
      setOrders(response.data || []);
    } catch (error) {
      console.error("Failed to load picking orders", error);
      toast({ title: "Unable to load picking orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await apiEndpoints.pickingOrders.approve(id);
      toast({ title: "Picking order approved" });
      fetchOrders();
    } catch (error) {
      console.error("Failed to approve picking order", error);
      toast({ title: "Unable to approve picking order", variant: "destructive" });
    }
  };

  return (
    <main className="p-6 space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Picking Orders</h1>
          <p className="text-muted-foreground">
            Track generated picking challans and continue to the loading report once approved.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => navigate("/orders/packing")}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create picking challan
          </Button>
        </div>
      </header>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading picking orders...
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No picking orders yet. Select deliveries from the packing queue to generate the first challan.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent picking challans</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="text-xs uppercase text-muted-foreground">
                    <TableHead>Order</TableHead>
                    <TableHead>Loading no.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Deliveries</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="text-sm">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{order.order_number}</span>
                          <span className="text-xs text-muted-foreground">
                            {order.created_at ? new Date(order.created_at).toLocaleString() : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{order.loading_no || "—"}</TableCell>
                      <TableCell>
                        {order.loading_date ? new Date(order.loading_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{order.vehicle_no || "Pending"}</span>
                          <span className="text-xs text-muted-foreground">{order.delivery_by || ""}</span>
                        </div>
                      </TableCell>
                      <TableCell>{Array.isArray(order.deliveries) ? order.deliveries.length : 0}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[order.status] || "outline"}>{order.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/orders/picking/${order.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/orders/picking/${order.id}/print`)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          {order.status !== "Approved" && (
                            <Button variant="ghost" size="icon" onClick={() => handleApprove(order.id)}>
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}


