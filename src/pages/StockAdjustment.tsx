import { useState, useEffect } from "react";
import { FileText, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";

const adjustmentRequests = [
  { id: "ADJ-001", product: "Paracetamol 500mg", batch: "BTH-2024-001", qty: -50, reason: "Damaged", status: "pending", date: "2025-01-15", submittedBy: "Mohammad Rahman" },
  { id: "ADJ-002", product: "Amoxicillin 250mg", batch: "BTH-2024-003", qty: 100, reason: "Found", status: "approved", date: "2025-01-14", submittedBy: "Fatema Khatun" },
  { id: "ADJ-003", product: "Insulin Vials", batch: "BTH-2024-002", qty: -25, reason: "Expired", status: "rejected", date: "2025-01-13", submittedBy: "Abdul Karim" },
];

export default function StockAdjustment() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    product: "",
    batch: "",
    qty: "",
    reason: "",
    remarks: ""
  });
  const [batches, setBatches] = useState<any[]>([]);

  // Load products from API
  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: apiEndpoints.products.getAll,
  });

  // Load stock ledger for batches
  const { data: stockLedgerResponse, isLoading: stockLoading } = useQuery({
    queryKey: ['stock-ledger'],
    queryFn: apiEndpoints.stockMaintenance.getLedger,
  });

  const products = productsResponse?.data || productsResponse || [];
  
  // Extract unique batches from stock ledger
  useEffect(() => {
    if (stockLedgerResponse) {
      const stockData = stockLedgerResponse.data || stockLedgerResponse || [];
      const uniqueBatches = Array.from(
        new Set(
          stockData
            .map((item: any) => item.batch || item.batch_number)
            .filter((batch: any) => batch)
        )
      ).map((batch: string) => ({ batch }));
      setBatches(uniqueBatches);
    }
  }, [stockLedgerResponse]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Adjustment request submitted", description: "Pending manager approval" });
    setFormData({ product: "", batch: "", qty: "", reason: "", remarks: "" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-muted text-foreground border-border"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Stock Adjustment</h1>
        <p className="text-muted-foreground">Request inventory adjustments with proper approval workflow</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">New Adjustment Request</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Product</label>
              <Select value={formData.product} onValueChange={(val) => setFormData({...formData, product: val})} disabled={productsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={productsLoading ? "Loading..." : products.length === 0 ? "No products available" : "Select product"} />
                </SelectTrigger>
                <SelectContent>
                  {productsLoading ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  ) : products.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No products available</div>
                  ) : (
                    products.map((product: any) => (
                      <SelectItem key={product.id} value={String(product.id)}>
                        {product.name || product.product_name}
                        {product.code ? ` (${product.code})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Batch Number</label>
              <Select value={formData.batch} onValueChange={(val) => setFormData({...formData, batch: val})} disabled={stockLoading || batches.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={stockLoading ? "Loading..." : batches.length === 0 ? "No batches available" : "Select batch"} />
                </SelectTrigger>
                <SelectContent>
                  {stockLoading ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  ) : batches.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No batches available</div>
                  ) : (
                    batches.map((item: any) => (
                      <SelectItem key={item.batch} value={item.batch}>
                        {item.batch}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Adjustment Quantity</label>
              <Input
                type="number"
                placeholder="Enter quantity (use - for reduction)"
                value={formData.qty}
                onChange={(e) => setFormData({...formData, qty: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Reason</label>
              <Select value={formData.reason} onValueChange={(val) => setFormData({...formData, reason: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="found">Stock Found</SelectItem>
                  <SelectItem value="missing">Stock Missing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Remarks</label>
              <Textarea
                placeholder="Additional details..."
                value={formData.remarks}
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full">Submit Request</Button>
          </form>
        </Card>

        <Card className="lg:col-span-2 p-6">
          <h2 className="text-lg font-semibold mb-4">Adjustment Requests</h2>

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustmentRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.id}</TableCell>
                      <TableCell>{req.product}</TableCell>
                      <TableCell>{req.batch}</TableCell>
                      <TableCell className={req.qty > 0 ? "text-success" : "text-destructive"}>
                        {req.qty > 0 ? "+" : ""}{req.qty}
                      </TableCell>
                      <TableCell>{req.reason}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell>{req.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustmentRequests.filter(r => r.status === "pending").map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.id}</TableCell>
                      <TableCell>{req.product}</TableCell>
                      <TableCell>{req.batch}</TableCell>
                      <TableCell className={req.qty > 0 ? "text-success" : "text-destructive"}>
                        {req.qty > 0 ? "+" : ""}{req.qty}
                      </TableCell>
                      <TableCell>{req.reason}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell>{req.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="approved" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustmentRequests.filter(r => r.status === "approved").map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.id}</TableCell>
                      <TableCell>{req.product}</TableCell>
                      <TableCell>{req.batch}</TableCell>
                      <TableCell className={req.qty > 0 ? "text-success" : "text-destructive"}>
                        {req.qty > 0 ? "+" : ""}{req.qty}
                      </TableCell>
                      <TableCell>{req.reason}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell>{req.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="rejected" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustmentRequests.filter(r => r.status === "rejected").map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.id}</TableCell>
                      <TableCell>{req.product}</TableCell>
                      <TableCell>{req.batch}</TableCell>
                      <TableCell className={req.qty > 0 ? "text-success" : "text-destructive"}>
                        {req.qty > 0 ? "+" : ""}{req.qty}
                      </TableCell>
                      <TableCell>{req.reason}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell>{req.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
