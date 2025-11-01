import { useState } from "react";
import { FileText, DollarSign, CreditCard, Clock, Download, Eye, Printer, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { invoices } from "@/lib/mockData";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

export default function Billing() {
  const [depotFilter, setDepotFilter] = useState("all");
  const [showSettlement, setShowSettlement] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<typeof invoices[0] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");
  
  const { sortedData, sortKey, sortOrder, handleSort } = useTableSort(invoices, "date" as any);
  const { filteredData, searchTerm, setSearchTerm } = useTableFilter(sortedData);

  const handleSettle = async () => {
    if (!paymentRef.trim()) {
      toast.error("Please enter payment reference");
      return;
    }
    
    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setProcessing(false);
    
    toast.success("Payment recorded successfully");
    setShowSettlement(false);
    setPaymentRef("");
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = invoices.filter((inv) => inv.status === "Paid").reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = invoices.filter((inv) => inv.status === "Pending").reduce((sum, inv) => sum + inv.amount, 0);
  const overdueAmount = invoices.filter((inv) => inv.status === "Overdue").reduce((sum, inv) => sum + inv.amount, 0);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Paid: "status-success",
      Pending: "status-info",
      Overdue: "status-error",
    };
    return <Badge className={colors[status]}>{status}</Badge>;
  };

  const columns = [
    { key: "id" as const, label: "Invoice No.", sortable: true },
    { key: "customer" as const, label: "Customer", sortable: true },
    { key: "date" as const, label: "Date", sortable: true },
    {
      key: "amount" as const,
      label: "Amount",
      sortable: true,
      align: "right" as const,
      render: (val: any) => `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    },
    { key: "mode" as const, label: "Payment Mode", sortable: true },
    {
      key: "status" as const,
      label: "Status",
      sortable: true,
      render: (val: any) => getStatusBadge(val),
    },
    {
      key: "dueDate" as const,
      label: "Due Date",
      sortable: true,
    },
    {
      key: "id" as const,
      label: "Actions",
      align: "right" as const,
      render: (_: any, row: any) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" className="hover-scale">
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button variant="ghost" size="sm" className="hover-scale">
            <Printer className="h-4 w-4" />
          </Button>
          {row.status !== "Paid" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedInvoice(row);
                setShowSettlement(true);
              }}
              className="hover-scale"
            >
              Settle
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Billing & Settlement</h1>
        <p className="text-muted-foreground">Manage invoices and payment settlements</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 hover-scale cursor-pointer transition-all hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Invoiced</p>
              <p className="text-2xl font-semibold">₹{(totalAmount / 100000).toFixed(2)}L</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover-scale cursor-pointer transition-all hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Collected</p>
              <p className="text-2xl font-semibold text-success">₹{(paidAmount / 100000).toFixed(2)}L</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover-scale cursor-pointer transition-all hover:shadow-lg">
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

        <Card className="p-4 hover-scale cursor-pointer transition-all hover:shadow-lg">
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

      {/* Invoice List */}
      <Card className="p-6 card-elevated">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Invoice List</h2>
          <div className="flex gap-4">
            <Select value={depotFilter} onValueChange={setDepotFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by depot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depots</SelectItem>
                <SelectItem value="bangalore">Bangalore Hub</SelectItem>
                <SelectItem value="mumbai">Mumbai Central</SelectItem>
                <SelectItem value="delhi">Delhi Main</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            
            <Button variant="outline" size="sm" className="hover-scale">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <DataTable
          data={filteredData}
          columns={columns}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={handleSort}
          emptyMessage="No invoices found"
        />
      </Card>

      {/* Settlement Dialog */}
      <Dialog open={showSettlement} onOpenChange={setShowSettlement}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Invoice: {selectedInvoice?.id} - {selectedInvoice?.customer}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm">
                <span className="font-medium">Amount:</span> ₹
                {selectedInvoice?.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm">
                <span className="font-medium">Payment Mode:</span> {selectedInvoice?.mode}
              </p>
              <p className="text-sm">
                <span className="font-medium">Due Date:</span> {selectedInvoice?.dueDate}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentRef">Payment Reference *</Label>
              <Input
                id="paymentRef"
                placeholder="Enter transaction reference"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input id="paymentDate" type="date" required />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSettlement(false)}
              disabled={processing}
              className="hover-scale"
            >
              Cancel
            </Button>
            <Button onClick={handleSettle} disabled={processing || !paymentRef.trim()} className="hover-scale">
              {processing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
