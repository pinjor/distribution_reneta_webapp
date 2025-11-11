import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { format } from "date-fns";
import { Download, Eye, Pencil, Trash2, CheckCircle2 } from "lucide-react";

interface ReceiptItem {
  id: number;
  receipt_number: string;
  source_type: "FACTORY" | "DEPOT" | "RETURN";
  status: "Draft" | "Approved";
  issued_date?: string;
  shipment_mode?: string;
  delivery_person?: string;
  target_depot_id?: number;
  items: Array<{ depot_quantity: number }>;
}

export default function ReceiveList() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (sourceFilter !== "ALL") params.source_type = sourceFilter;
      if (statusFilter !== "ALL") params.status_filter = statusFilter;
      const response = await apiEndpoints.productReceipts.getAll(params);
      setReceipts(response.data || []);
    } catch (error) {
      console.error("Failed to load receipts", error);
      toast({ title: "Unable to load receipts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sourceFilter, statusFilter]);

  const totalQuantity = useMemo(
    () =>
      receipts.reduce(
        (sum, receipt) =>
          sum + receipt.items.reduce((subtotal, item) => subtotal + (Number(item.depot_quantity) || 0), 0),
        0,
      ),
    [receipts],
  );

  const handleDelete = async (id: number) => {
    try {
      await apiEndpoints.productReceipts.delete(id);
      toast({ title: "Receipt deleted" });
      loadData();
    } catch (error) {
      console.error("Failed to delete receipt", error);
      toast({ title: "Unable to delete receipt", variant: "destructive" });
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await apiEndpoints.productReceipts.approve(id);
      toast({ title: "Receipt approved" });
      loadData();
    } catch (error) {
      console.error("Failed to approve receipt", error);
      toast({ title: "Unable to approve receipt", variant: "destructive" });
    }
  };

  const handleView = (id: number) => {
    navigate(`/receive/report/${id}`);
  };

  const handlePrint = (id: number) => {
    window.open(`/receive/report/${id}`, "_blank");
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <main className="p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Product Receipts</h1>
          <p className="text-muted-foreground">Manage factory, depot, and stock return receipts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/receive/factory")}>New Factory Receipt</Button>
          <Button onClick={() => navigate("/receive/depot")}>New Depot Receipt</Button>
          <Button onClick={() => navigate("/receive/return")}>New Return Receipt</Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All sources</SelectItem>
                  <SelectItem value="FACTORY">Factory</SelectItem>
                  <SelectItem value="DEPOT">Depot</SelectItem>
                  <SelectItem value="RETURN">Stock return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
              Total quantity:&nbsp;
              <span className="font-semibold text-foreground">{totalQuantity.toLocaleString()}</span>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow className="uppercase text-xs text-muted-foreground">
                  <TableHead className="w-12">SL</TableHead>
                  <TableHead>Receipt number</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued date</TableHead>
                  <TableHead>Shipment mode</TableHead>
                  <TableHead>Delivery person</TableHead>
                  <TableHead className="text-right">Total qty</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                      Loading receipts...
                    </TableCell>
                  </TableRow>
                ) : receipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                      No receipts found. Create a new receipt to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  receipts.map((receipt, index) => {
                    const qty = receipt.items.reduce((sum, item) => sum + (Number(item.depot_quantity) || 0), 0);
                    return (
                      <TableRow key={receipt.id} className="text-sm">
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium text-foreground">{receipt.receipt_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{receipt.source_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadge(receipt.status)}>{receipt.status}</Badge>
                        </TableCell>
                        <TableCell>{receipt.issued_date ? format(new Date(receipt.issued_date), "dd MMM yyyy") : "—"}</TableCell>
                        <TableCell>{receipt.shipment_mode || "—"}</TableCell>
                        <TableCell>{receipt.delivery_person || "—"}</TableCell>
                        <TableCell className="text-right">{qty}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleView(receipt.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={receipt.status !== "Draft"}
                              onClick={() => navigate(`/receive/${receipt.source_type.toLowerCase()}?receiptId=${receipt.id}`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handlePrint(receipt.id)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={receipt.status !== "Draft"}
                              onClick={() => handleApprove(receipt.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={receipt.status !== "Draft"}
                              onClick={() => handleDelete(receipt.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
