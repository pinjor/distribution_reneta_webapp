import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  Search, 
  RefreshCw,
  Loader2,
  FileText,
  ChevronDown,
  ChevronRight,
  Truck,
  User,
  Package,
  ArrowLeft,
  FileBarChart,
} from "lucide-react";
import { OrderBreadcrumb } from "@/components/layout/OrderBreadcrumb";
import { TAG_COLORS } from "@/lib/tagColors";

interface CollectionOrder {
  id: number;
  order_number?: string | null;
  memo_number?: string | null;
  customer_name: string;
  customer_code?: string | null;
  pso_name: string;
  delivery_date: string;
  total_amount?: number;
  collected_amount?: number;
  pending_amount?: number;
  collection_status: "Pending" | "Partially Collected" | "Postponed" | "Fully Collected";
  collection_type?: "Partial" | "Postponed" | null;
  loading_number?: string | null;
  loading_date?: string | null;
  area?: string | null;
  assigned_employee_name?: string | null;
  assigned_employee_code?: string | null;
  assigned_vehicle_registration?: string | null;
  created_at?: string;
  collection_source?: "Mobile App" | "Web";
  collection_approved?: boolean;
}

interface LoadingGroup {
  loading_number: string;
  loading_date: string;
  area: string;
  employee_name: string;
  employee_code: string;
  vehicle_registration: string;
  orders: CollectionOrder[];
  total_orders: number;
  total_collected: number;
  total_pending: number;
  total_amount: number;
}

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

export default function ApprovalForCollection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedLoadingNumbers, setExpandedLoadingNumbers] = useState<Record<string, boolean>>({});
  const [approvingLoadingNumber, setApprovingLoadingNumber] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Approval for Collection | Renata";
  }, []);

  const { data: ordersData, isLoading: loading, refetch } = useQuery({
    queryKey: ['collection-approval-orders', statusFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (statusFilter && statusFilter !== "all") {
        params.status_filter = statusFilter;
      }
      const result = await apiEndpoints.orders.getCollectionApprovalList(params);
      return Array.isArray(result) ? result : (result?.data || result || []);
    },
  });

  const orders: CollectionOrder[] = Array.isArray(ordersData) ? ordersData : [];

  const filteredOrders = orders.filter((order: CollectionOrder) => {
    const term = searchTerm.toLowerCase();
    return (
      order.memo_number?.toLowerCase().includes(term) ||
      order.order_number?.toLowerCase().includes(term) ||
      order.customer_name.toLowerCase().includes(term) ||
      order.customer_code?.toLowerCase().includes(term) ||
      order.pso_name.toLowerCase().includes(term) ||
      order.loading_number?.toLowerCase().includes(term)
    );
  });

  // Group orders by loading_number
  const loadingGroups = useMemo(() => {
    const groups: Record<string, LoadingGroup> = {};
    
    filteredOrders.forEach((order) => {
      const loadingNo = order.loading_number || `UNASSIGNED-${order.id}`;
      
      if (!groups[loadingNo]) {
        groups[loadingNo] = {
          loading_number: loadingNo,
          loading_date: order.loading_date || order.delivery_date,
          area: order.area || "N/A",
          employee_name: order.assigned_employee_name || "N/A",
          employee_code: order.assigned_employee_code || "",
          vehicle_registration: order.assigned_vehicle_registration || "N/A",
          orders: [],
          total_orders: 0,
          total_collected: 0,
          total_pending: 0,
          total_amount: 0,
        };
      }
      
      groups[loadingNo].orders.push(order);
      groups[loadingNo].total_orders += 1;
      groups[loadingNo].total_collected += order.collected_amount || 0;
      groups[loadingNo].total_pending += order.pending_amount || 0;
      groups[loadingNo].total_amount += order.total_amount || 0;
    });
    
    // Sort by loading_date (most recent first), then by loading_number
    const sortedGroups = Object.values(groups).sort((a, b) => {
      const dateA = new Date(a.loading_date).getTime();
      const dateB = new Date(b.loading_date).getTime();
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      return b.loading_number.localeCompare(a.loading_number);
    });
    
    return sortedGroups;
  }, [filteredOrders]);

  const toggleExpand = (loadingNumber: string) => {
    setExpandedLoadingNumbers((prev) => ({ ...prev, [loadingNumber]: !prev[loadingNumber] }));
  };

  const handleApproveLoading = async (loadingNumber: string) => {
    try {
      setApprovingLoadingNumber(loadingNumber);
      
      // Get all orders in this loading group
      const groupOrders = loadingGroups.find(g => g.loading_number === loadingNumber);
      if (!groupOrders) return;

      // Approve all orders in this loading number using the new endpoint (for mobile app collections)
      await apiEndpoints.orders.approveCollectionByLoading(loadingNumber);

      toast({
        title: "Collection approved successfully",
        description: `All orders in loading ${loadingNumber} have been approved. Status updated in mobile app.`,
      });

      // Print money receipt report
      await handlePrintMoneyReceipt(loadingNumber);

      // Refetch to update the list
      queryClient.invalidateQueries({ queryKey: ['collection-approval-orders'] });
      refetch();
    } catch (error: any) {
      console.error("Failed to approve collection", error);
      toast({
        title: "Approval failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setApprovingLoadingNumber(null);
    }
  };

  const handlePrintMoneyReceipt = async (loadingNumber: string) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost/api';
      const response = await fetch(`${apiUrl}/orders/money-receipt/${encodeURIComponent(loadingNumber)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate money receipt');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Money_Receipt_${loadingNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error("Failed to print money receipt", error);
      toast({
        title: "Print failed",
        description: "Money receipt could not be printed. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colorConfig = TAG_COLORS[status as keyof typeof TAG_COLORS] || TAG_COLORS["Pending"];
    
    return (
      <span 
        className="inline-flex items-center rounded-full text-white font-bold text-xs px-2.5 py-1 shadow-lg ring-2"
        style={{ backgroundColor: colorConfig.bg }}
      >
        {status}
      </span>
    );
  };

  const hasPendingApprovals = (group: LoadingGroup) => {
    return group.orders.some(order => 
      order.collection_status === "Pending" ||
      order.collection_status === "Partially Collected" ||
      order.collection_status === "Postponed"
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <OrderBreadcrumb />
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/orders/distribution-cockpit")}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Approval for Collection</h1>
          <p className="text-muted-foreground mt-1">
            Approve orders with partial or cancelled collection status from mobile app. Orders are grouped by loading number.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by memo number, customer, loading number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Partially Collected">Partially Collected</SelectItem>
                  <SelectItem value="Postponed">Postponed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading Groups List */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Approval List ({loadingGroups.length} Loading Groups)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="text-sm">Loading orders…</p>
            </div>
          ) : loadingGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <Package className="h-10 w-10" />
              <p className="text-sm">No orders found for collection approval.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {loadingGroups.map((group) => {
                const isExpanded = expandedLoadingNumbers[group.loading_number];
                const hasPending = hasPendingApprovals(group);
                
                return (
                  <div key={group.loading_number} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-card">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => toggleExpand(group.loading_number)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:text-foreground hover:bg-muted"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold text-foreground">
                              Loading No: {group.loading_number}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
                            <span>Date: {formatDate(group.loading_date)}</span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {group.employee_name} {group.employee_code ? `(${group.employee_code})` : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {group.vehicle_registration}
                            </span>
                            <span>Orders: {group.total_orders}</span>
                            <span>Total: ৳{group.total_amount.toFixed(2)}</span>
                            <span>Collected: ৳{group.total_collected.toFixed(2)}</span>
                            <span>Pending: ৳{group.total_pending.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {hasPending && (
                          <Button
                            onClick={() => handleApproveLoading(group.loading_number)}
                            size="sm"
                            className="flex items-center gap-2 whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
                            disabled={approvingLoadingNumber === group.loading_number}
                          >
                            {approvingLoadingNumber === group.loading_number ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Approving...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Approve</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t bg-muted/30">
                        <div className="pt-4">
                          <h4 className="text-sm font-semibold mb-3 text-foreground">
                            Memos ({group.orders.length})
                          </h4>
                          {group.orders.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-4 text-center">
                              No orders found in this loading group.
                            </div>
                          ) : (
                            <div className="rounded-md border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Memo No.</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>PSO</TableHead>
                                    <TableHead>Delivery Date</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Collected</TableHead>
                                    <TableHead className="text-right">Pending</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {group.orders.map((order) => (
                                    <TableRow key={order.id}>
                                      <TableCell className="font-medium font-mono text-sm">
                                        {order.memo_number || "—"}
                                      </TableCell>
                                      <TableCell>
                                        <div>
                                          <div className="font-medium">{order.customer_name}</div>
                                          {order.customer_code && (
                                            <div className="text-sm text-muted-foreground">{order.customer_code}</div>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>{order.pso_name}</TableCell>
                                      <TableCell>{formatDate(order.delivery_date)}</TableCell>
                                      <TableCell className="text-right font-medium">
                                        ৳{Number(order.total_amount || 0).toFixed(2)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {order.collected_amount ? `৳${Number(order.collected_amount).toFixed(2)}` : "—"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {order.pending_amount ? `৳${Number(order.pending_amount).toFixed(2)}` : "—"}
                                      </TableCell>
                                      <TableCell>{getStatusBadge(order.collection_status)}</TableCell>
                                      <TableCell>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => navigate(`/orders/mis-report?memo_id=${order.id}`)}
                                          className="flex items-center gap-2"
                                        >
                                          <FileBarChart className="h-4 w-4" />
                                          <span>View in MIS</span>
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}