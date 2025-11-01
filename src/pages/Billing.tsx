import { useState } from "react";
import { FileText, DollarSign, CreditCard, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const invoices = [
  { id: "INV-2025-001", customer: "Apollo Pharmacy", date: "2025-01-15", amount: 125000, paymentMode: "Credit", status: "paid" },
  { id: "INV-2025-002", customer: "MedPlus Stores", date: "2025-01-14", amount: 87500, paymentMode: "Cash", status: "pending" },
  { id: "INV-2025-003", customer: "City Hospital", date: "2025-01-13", amount: 215000, paymentMode: "Credit", status: "overdue" },
];

export default function Billing() {
  const [depotFilter, setDepotFilter] = useState("all");
  const [showSettlement, setShowSettlement] = useState(false);
  const { toast } = useToast();

  const handleSettle = () => {
    toast({ title: "Payment recorded", description: "Invoice marked as paid" });
    setShowSettlement(false);
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = invoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = invoices.filter(inv => inv.status === "pending").reduce((sum, inv) => sum + inv.amount, 0);
  const overdueAmount = invoices.filter(inv => inv.status === "overdue").reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Billing & Settlement</h1>
        <p className="text-muted-foreground">Manage invoices and payment settlements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Invoiced</p>
              <p className="text-2xl font-semibold">₹{(totalAmount / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-2xl font-semibold text-success">₹{(paidAmount / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-semibold text-warning">₹{(pendingAmount / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-semibold text-destructive">₹{(overdueAmount / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Invoice List</h2>
          <div className="flex gap-4">
            <Select value={depotFilter} onValueChange={setDepotFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by depot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depots</SelectItem>
                <SelectItem value="chennai">Chennai Main</SelectItem>
                <SelectItem value="south">Chennai South</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="w-[180px]" />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No.</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.id}</TableCell>
                <TableCell>{invoice.customer}</TableCell>
                <TableCell>{invoice.date}</TableCell>
                <TableCell>₹{invoice.amount.toLocaleString()}</TableCell>
                <TableCell>{invoice.paymentMode}</TableCell>
                <TableCell>
                  {invoice.status === "paid" && (
                    <Badge className="bg-success/10 text-success border-success/20">Paid</Badge>
                  )}
                  {invoice.status === "pending" && (
                    <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>
                  )}
                  {invoice.status === "overdue" && (
                    <Badge className="bg-destructive/10 text-destructive border-destructive/20">Overdue</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">View</Button>
                    {invoice.status !== "paid" && (
                      <Button size="sm" onClick={() => setShowSettlement(true)}>Settle</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Payment Distribution</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Cash Collected</span>
                <span className="text-sm font-semibold">29%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success" style={{ width: "29%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Credit</span>
                <span className="text-sm font-semibold">71%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: "71%" }} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Outstanding Summary</h2>
          <div className="space-y-3">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">0-30 Days</p>
              <p className="text-xl font-semibold">₹87,500</p>
            </div>
            <div className="p-4 bg-warning/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">30-60 Days</p>
              <p className="text-xl font-semibold text-warning">₹1,25,000</p>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">60+ Days (Overdue)</p>
              <p className="text-xl font-semibold text-destructive">₹2,15,000</p>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={showSettlement} onOpenChange={setShowSettlement}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Enter payment details to settle invoice</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Invoice</label>
              <Input value="INV-2025-002" disabled />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Amount</label>
              <Input value="₹87,500" disabled />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Payment Reference</label>
              <Input placeholder="Enter transaction ID or check number" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Payment Date</label>
              <Input type="date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettlement(false)}>Cancel</Button>
            <Button onClick={handleSettle}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
