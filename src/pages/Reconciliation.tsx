import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const reconciliationData = [
  { routeId: "RT-001", deliveries: 5, planned: 5, delivered: 5, cashExpected: 25000, cashCollected: 25000, variance: 0, status: "complete" },
  { routeId: "RT-002", deliveries: 7, planned: 7, delivered: 6, cashExpected: 35000, cashCollected: 30000, variance: -5000, status: "partial" },
  { routeId: "RT-003", deliveries: 4, planned: 4, delivered: 3, cashExpected: 20000, cashCollected: 15000, variance: -5000, status: "failed" },
];

export default function Reconciliation() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Post-Delivery Reconciliation</h1>
        <p className="text-muted-foreground">Verify deliveries and cash collections</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Routes</p>
          <p className="text-2xl font-semibold">{reconciliationData.length}</p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Completed</p>
          <p className="text-2xl font-semibold text-success">
            {reconciliationData.filter(r => r.status === "complete").length}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Cash Expected</p>
          <p className="text-2xl font-semibold">
            ₹{(reconciliationData.reduce((sum, r) => sum + r.cashExpected, 0) / 1000).toFixed(0)}K
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Cash Collected</p>
          <p className="text-2xl font-semibold text-success">
            ₹{(reconciliationData.reduce((sum, r) => sum + r.cashCollected, 0) / 1000).toFixed(0)}K
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Reconciliation Summary</h2>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route ID</TableHead>
              <TableHead>Total Deliveries</TableHead>
              <TableHead>Planned</TableHead>
              <TableHead>Delivered</TableHead>
              <TableHead>Cash Expected</TableHead>
              <TableHead>Cash Collected</TableHead>
              <TableHead>Variance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reconciliationData.map((route) => (
              <TableRow key={route.routeId}>
                <TableCell className="font-medium">{route.routeId}</TableCell>
                <TableCell>{route.deliveries}</TableCell>
                <TableCell>{route.planned}</TableCell>
                <TableCell>{route.delivered}</TableCell>
                <TableCell>₹{route.cashExpected.toLocaleString()}</TableCell>
                <TableCell>₹{route.cashCollected.toLocaleString()}</TableCell>
                <TableCell className={route.variance < 0 ? "text-destructive font-semibold" : "text-success"}>
                  {route.variance === 0 ? "✓" : `₹${route.variance.toLocaleString()}`}
                </TableCell>
                <TableCell>
                  {route.status === "complete" && (
                    <Badge className="bg-success/10 text-success border-success/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                  {route.status === "partial" && (
                    <Badge className="bg-warning/10 text-warning border-warning/20">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Partial
                    </Badge>
                  )}
                  {route.status === "failed" && (
                    <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                      <XCircle className="h-3 w-3 mr-1" />
                      Issues
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Delivery Success Rate</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">RT-001</span>
                <span className="text-sm font-semibold text-success">100%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">RT-002</span>
                <span className="text-sm font-semibold text-warning">86%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-warning" style={{ width: "86%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">RT-003</span>
                <span className="text-sm font-semibold text-destructive">75%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-destructive" style={{ width: "75%" }} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Cash Collection Variance</h2>
          <div className="space-y-3">
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Collected as Expected</p>
              <p className="text-xl font-semibold text-success">₹25,000</p>
              <p className="text-xs text-muted-foreground mt-1">1 route</p>
            </div>
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Shortfall</p>
              <p className="text-xl font-semibold text-destructive">₹10,000</p>
              <p className="text-xs text-muted-foreground mt-1">2 routes with variance</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
