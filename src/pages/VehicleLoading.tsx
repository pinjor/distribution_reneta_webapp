import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Download, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LoadingChallan {
  id: number;
  order_number: string;
  loading_no?: string;
  loading_date?: string;
  vehicle_no?: string;
  delivery_by?: string;
  area?: string;
  status: string;
  deliveries: Array<{
    id: number;
    delivery_id?: number;
    memo_no?: string;
    value?: number;
    status?: string;
    customer?: {
      id: number;
      name: string;
      code: string;
    };
  }>;
  created_at?: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  customer_id: number;
  customer_name: string;
  amount: number;
  status: string;
}

export default function VehicleLoading() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [challans, setChallans] = useState<LoadingChallan[]>([]);
  const [expandedChallans, setExpandedChallans] = useState<Set<number>>(new Set());
  const [invoices, setInvoices] = useState<Record<number, Invoice[]>>({}); // challan_id -> invoices

  const fetchChallans = async () => {
    try {
      setLoading(true);
      const response = await apiEndpoints.pickingOrders.getAll();
      // Filter only approved picking orders (loading challans)
      const approvedChallans = (response.data || []).filter(
        (order: LoadingChallan) => order.status === "Approved"
      );
      setChallans(approvedChallans);
    } catch (error) {
      console.error("Failed to load loading challans", error);
      toast({ title: "Unable to load loading challans", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoicesForChallan = async (challanId: number) => {
    try {
      // Group deliveries by customer and fetch/create invoices
      const challan = challans.find((c) => c.id === challanId);
      if (!challan) return;

      // For now, we'll create a mock structure. In production, this would call an API
      // that groups deliveries by customer and returns invoices
      const customerGroups: Record<number, any[]> = {};
      
      challan.deliveries?.forEach((delivery: any) => {
        // Assuming delivery has customer info or we need to fetch it
        const customerId = delivery.customer?.id || delivery.customer_id;
        if (!customerGroups[customerId]) {
          customerGroups[customerId] = [];
        }
        customerGroups[customerId].push(delivery);
      });

      // Mock invoices - in production, fetch from API
      const mockInvoices: Invoice[] = Object.entries(customerGroups).map(([customerId, deliveries]) => {
        const totalAmount = deliveries.reduce((sum, d) => sum + Number(d.value || 0), 0);
        const firstDelivery = deliveries[0];
        return {
          id: parseInt(customerId) * 1000 + challanId, // Mock ID
          invoice_number: `INV-${challan.loading_no || challan.order_number}-${customerId}`,
          invoice_date: challan.loading_date || new Date().toISOString().split('T')[0],
          customer_id: parseInt(customerId),
          customer_name: firstDelivery.customer?.name || `Customer ${customerId}`,
          amount: totalAmount,
          status: "Pending",
        };
      });

      setInvoices((prev) => ({ ...prev, [challanId]: mockInvoices }));
    } catch (error) {
      console.error("Failed to load invoices", error);
      toast({ title: "Unable to load invoices", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchChallans();
  }, []);

  const toggleChallan = (challanId: number) => {
    const newExpanded = new Set(expandedChallans);
    if (newExpanded.has(challanId)) {
      newExpanded.delete(challanId);
    } else {
      newExpanded.add(challanId);
      // Fetch invoices when expanding
      if (!invoices[challanId]) {
        fetchInvoicesForChallan(challanId);
      }
    }
    setExpandedChallans(newExpanded);
  };

  const handleBulkInvoiceGeneration = async (challanId: number) => {
    try {
      setGenerating(true);
      const challan = challans.find((c) => c.id === challanId);
      if (!challan) return;

      // Group deliveries by customer
      const customerGroups: Record<number, any[]> = {};
      challan.deliveries?.forEach((delivery: any) => {
        const customerId = delivery.customer?.id || delivery.customer_id;
        if (!customerGroups[customerId]) {
          customerGroups[customerId] = [];
        }
        customerGroups[customerId].push(delivery);
      });

      // Generate invoices for each customer
      const generatedInvoices: Invoice[] = [];
      for (const [customerId, deliveries] of Object.entries(customerGroups)) {
        const totalAmount = deliveries.reduce((sum, d) => sum + Number(d.value || 0), 0);
        const firstDelivery = deliveries[0];
        
        // In production, call API to generate invoice
        // const invoice = await apiEndpoints.invoices.create({...});
        
        const invoice: Invoice = {
          id: parseInt(customerId) * 1000 + challanId,
          invoice_number: `INV-${challan.loading_no || challan.order_number}-${customerId}-${Date.now()}`,
          invoice_date: challan.loading_date || new Date().toISOString().split('T')[0],
          customer_id: parseInt(customerId),
          customer_name: firstDelivery.customer?.name || `Customer ${customerId}`,
          amount: totalAmount,
          status: "Generated",
        };
        generatedInvoices.push(invoice);
      }

      setInvoices((prev) => ({ ...prev, [challanId]: generatedInvoices }));
      toast({
        title: "Invoices generated successfully",
        description: `Generated ${generatedInvoices.length} invoice(s) for ${challan.order_number}`,
      });
    } catch (error) {
      console.error("Failed to generate invoices", error);
      toast({ title: "Unable to generate invoices", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Approved: "bg-green-500/10 text-green-600 border-green-500/20",
      Pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      Generated: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    };
    return (
      <Badge variant="outline" className={colors[status] || ""}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Loading List</h1>
          <p className="text-muted-foreground">Manage loading challans and generate bulk invoices for chemist shops</p>
        </div>
        <Button variant="outline" onClick={fetchChallans} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading challans...</p>
        </Card>
      ) : challans.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No loading challans found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Approved loading requests will appear here
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {challans.map((challan) => {
            const isExpanded = expandedChallans.has(challan.id);
            const challanInvoices = invoices[challan.id] || [];
            const hasInvoices = challanInvoices.length > 0;

            return (
              <Card key={challan.id} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleChallan(challan.id)}>
                  <CollapsibleTrigger asChild>
                    <div className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">{challan.loading_no || challan.order_number}</h3>
                              {getStatusBadge(challan.status)}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              {challan.loading_date && (
                                <span>Date: {new Date(challan.loading_date).toLocaleDateString()}</span>
                              )}
                              {challan.vehicle_no && <span>Vehicle: {challan.vehicle_no}</span>}
                              {challan.area && <span>Area: {challan.area}</span>}
                              <span>Deliveries: {challan.deliveries?.length || 0}</span>
                              {hasInvoices && (
                                <span className="text-primary font-medium">
                                  Invoices: {challanInvoices.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {!hasInvoices && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBulkInvoiceGeneration(challan.id);
                            }}
                            disabled={generating}
                            className="ml-4"
                          >
                            {generating ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4 mr-2" />
                                Generate Invoices
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t bg-muted/30">
                      {hasInvoices ? (
                        <div className="p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">Invoices by Chemist Shop</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBulkInvoiceGeneration(challan.id)}
                              disabled={generating}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Regenerate All
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {challanInvoices.map((invoice) => (
                              <Card key={invoice.id} className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h5 className="font-medium">{invoice.invoice_number}</h5>
                                      {getStatusBadge(invoice.status)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Chemist Shop:</span>
                                        <span className="ml-2 font-medium">{invoice.customer_name}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Date:</span>
                                        <span className="ml-2 font-medium">
                                          {new Date(invoice.invoice_date).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Amount:</span>
                                        <span className="ml-2 font-semibold text-lg">
                                          {invoice.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                    </div>
                                    {/* Show products if delivery has empty products list */}
                                    {challan.deliveries?.find((d: any) => d.customer?.id === invoice.customer_id)?.items?.length === 0 && (
                                      <div className="mt-3 pt-3 border-t">
                                        <p className="text-sm font-medium mb-2">Products:</p>
                                        <div className="text-sm text-muted-foreground">
                                          {challan.deliveries?.find((d: any) => d.customer?.id === invoice.customer_id)?.items?.length === 0 ? (
                                            <p>No products listed. Products will be added during delivery.</p>
                                          ) : (
                                            <ul className="list-disc list-inside space-y-1">
                                              {challan.deliveries?.find((d: any) => d.customer?.id === invoice.customer_id)?.items?.map((item: any, idx: number) => (
                                                <li key={idx}>{item.product_name || item.name} - Qty: {item.quantity}</li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm">
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </Button>
                                    <Button variant="outline" size="sm">
                                      <FileText className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground mb-4">No invoices generated yet</p>
                          <Button
                            onClick={() => handleBulkInvoiceGeneration(challan.id)}
                            disabled={generating}
                          >
                            {generating ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4 mr-2" />
                                Generate Bulk Invoices
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
