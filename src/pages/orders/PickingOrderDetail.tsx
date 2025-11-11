import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { Loader2, Printer, RefreshCw, CheckCircle2 } from "lucide-react";

interface PickingOrderDetailResponse {
  id: number;
  order_number: string;
  loading_no?: string;
  loading_date?: string;
  area?: string;
  delivery_by?: string;
  vehicle_no?: string;
  remarks?: string;
  status: string;
  deliveries: Array<{
    id: number;
    memo_no?: string;
    value?: number;
    status?: string;
    pso?: string;
    remarks?: string;
    cash?: number;
    dues?: number;
    amend?: number;
    returns?: number;
  }>;
  created_at?: string;
}

const STATUS_VARIANT: Record<string, "secondary" | "default" | "outline"> = {
  Draft: "secondary",
  Approved: "default",
};

export default function PickingOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<PickingOrderDetailResponse | null>(null);
  const [approving, setApproving] = useState(false);

  const fetchOrder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await apiEndpoints.pickingOrders.getById(id);
      setOrder(response);
    } catch (error) {
      console.error("Failed to load picking order", error);
      toast({ title: "Unable to load picking order", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleApprove = async () => {
    if (!id) return;
    try {
      setApproving(true);
      const response = await apiEndpoints.pickingOrders.approve(id);
      setOrder(response);
      toast({ title: "Picking order approved" });
    } catch (error) {
      console.error("Failed to approve picking order", error);
      toast({ title: "Unable to approve picking order", variant: "destructive" });
    } finally {
      setApproving(false);
    }
  };

  if (loading || !order) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading picking challan...
          </CardContent>
        </Card>
      </main>
    );
  }

  const totals = order.deliveries.reduce(
    (acc, line) => ({
      value: acc.value + Number(line.value || 0),
      cash: acc.cash + Number(line.cash || 0),
      dues: acc.dues + Number(line.dues || 0),
      amend: acc.amend + Number(line.amend || 0),
      returns: acc.returns + Number(line.returns || 0),
    }),
    { value: 0, cash: 0, dues: 0, amend: 0, returns: 0 },
  );

  return (
    <main className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Picking challan {order.order_number}</h1>
          <Badge variant={STATUS_VARIANT[order.status] || "outline"}>{order.status}</Badge>
        </div>
        <p className="text-muted-foreground">
          Review details of the picking challan before printing the loading report.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={fetchOrder}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button variant="outline" onClick={() => navigate(`/orders/picking/${order.id}/print`)}>
          <Printer className="h-4 w-4 mr-2" />
          Print loading report
        </Button>
        {order.status !== "Approved" && (
          <Button onClick={handleApprove} disabled={approving}>
            {approving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Approve
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Challan details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs uppercase">Loading number</p>
            <p className="font-medium text-foreground">{order.loading_no || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Loading date</p>
            <p className="font-medium text-foreground">
              {order.loading_date ? new Date(order.loading_date).toLocaleDateString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Vehicle</p>
            <p className="font-medium text-foreground">{order.vehicle_no || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Delivery by</p>
            <p className="font-medium text-foreground">{order.delivery_by || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Area</p>
            <p className="font-medium text-foreground">{order.area || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Remarks</p>
            <p className="font-medium text-foreground whitespace-pre-wrap">
              {order.remarks || "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Delivery lines</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs uppercase text-muted-foreground">
                  <TableHead>Memo no.</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>PSO</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Cash</TableHead>
                  <TableHead>Dues</TableHead>
                  <TableHead>Amend</TableHead>
                  <TableHead>Return</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.deliveries.map((line) => (
                  <TableRow key={line.id} className="text-sm">
                    <TableCell className="font-medium text-foreground">{line.memo_no || "—"}</TableCell>
                    <TableCell>{Number(line.value || 0).toLocaleString()}</TableCell>
                    <TableCell>{line.status || "—"}</TableCell>
                    <TableCell>{line.pso || "—"}</TableCell>
                    <TableCell>{line.remarks || "—"}</TableCell>
                    <TableCell>{Number(line.cash || 0).toLocaleString()}</TableCell>
                    <TableCell>{Number(line.dues || 0).toLocaleString()}</TableCell>
                    <TableCell>{Number(line.amend || 0).toLocaleString()}</TableCell>
                    <TableCell>{Number(line.returns || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-medium text-sm">
                  <TableCell>Total</TableCell>
                  <TableCell>{totals.value.toLocaleString()}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell>{totals.cash.toLocaleString()}</TableCell>
                  <TableCell>{totals.dues.toLocaleString()}</TableCell>
                  <TableCell>{totals.amend.toLocaleString()}</TableCell>
                  <TableCell>{totals.returns.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}


