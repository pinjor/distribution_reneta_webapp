import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { apiEndpoints } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface PickingOrderLine {
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
}

interface PickingOrderReport {
  id: number;
  order_number: string;
  loading_no?: string;
  loading_date?: string;
  delivery_by?: string;
  vehicle_no?: string;
  area?: string;
  remarks?: string;
  status: string;
  deliveries: PickingOrderLine[];
}

export default function PickingOrderPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<PickingOrderReport | null>(null);

  const loadOrder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await apiEndpoints.pickingOrders.report(id);
      setOrder(response);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  useEffect(() => {
    if (!loading && order) {
      const timer = setTimeout(() => window.print(), 350);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [loading, order]);

  if (loading || !order) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Preparing loading report...
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
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Loading report</h1>
          <p className="text-muted-foreground">
            Print-ready summary for picking challan {order.order_number}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>

      <section className="space-y-2 text-center">
        <h2 className="text-xl font-semibold uppercase tracking-wide">RENATA LIMITED</h2>
        <p className="text-sm uppercase tracking-wide">Loading Report</p>
        <p className="text-sm text-muted-foreground uppercase">
          COD / Invoice Sales
        </p>
      </section>

      <section className="grid gap-2 text-sm sm:grid-cols-2 print:grid-cols-2">
        <div>
          <p className="text-muted-foreground text-xs uppercase">Loading no.</p>
          <p className="font-medium text-foreground">{order.loading_no || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase">Date</p>
          <p className="font-medium text-foreground">
            {order.loading_date ? new Date(order.loading_date).toLocaleDateString() : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase">Delivery by</p>
          <p className="font-medium text-foreground">{order.delivery_by || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase">Vehicle no.</p>
          <p className="font-medium text-foreground">{order.vehicle_no || "—"}</p>
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
      </section>

      <section>
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
                  <TableCell>{line.memo_no || "—"}</TableCell>
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
                <TableCell className="uppercase">Grand total</TableCell>
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
      </section>
    </main>
  );
}


