import { useState } from "react";
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
} from "lucide-react";

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
  remarks?: string | null;
  created_at?: string;
  collection_source?: "Mobile App" | "Web";
}

export default function ApprovalForCollection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const { data: ordersData, isLoading: loading, refetch } = useQuery({
    queryKey: ['collection-approval-orders', statusFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (statusFilter && statusFilter !== "all") {
        params.status_filter = statusFilter;
      }
      // This endpoint will need to be created in the backend
      const result = await apiEndpoints.orders.getCollectionApprovalList(params);
      return Array.isArray(result) ? result : (result?.data || result || []);
    },
  });

  const orders = Array.isArray(ordersData) ? ordersData : [];

  const filteredOrders = orders.filter((order: CollectionOrder) => {
    const term = searchTerm.toLowerCase();
    return (
      order.memo_number?.toLowerCase().includes(term) ||
      order.order_number?.toLowerCase().includes(term) ||
      order.customer_name.toLowerCase().includes(term) ||
      order.customer_code?.toLowerCase().includes(term) ||
      order.pso_name.toLowerCase().includes(term)
    );
  });

  const handleApprove = async (orderId: number) => {
    try {
      setApprovingId(orderId);
      await apiEndpoints.orders.approveCollection(orderId);
      toast({ 
        title: "Order approved", 
        description: "Order has been approved for collection processing" 
      });
      queryClient.invalidateQueries({ queryKey: ['collection-approval-orders'] });
      refetch();
    } catch (error: any) {
      console.error("Failed to approve order", error);
      const errorMessage = error?.message || error?.details || "Unknown error occurred";
      toast({ 
        title: "Unable to approve order", 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally {
      setApprovingId(null);
    }
  };


  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string, className: string }> = {
      "Pending": { 
        label: "Pending", 
        className: "bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-white border-yellow-600 shadow-md font-semibold px-3 py-1" 
      },
      "Partially Collected": { 
        label: "Partially Collected", 
        className: "bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white border-blue-700 shadow-md font-semibold px-3 py-1 animate-pulse" 
      },
      "Postponed": { 
        label: "Postponed", 
        className: "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white border-orange-600 shadow-md font-semibold px-3 py-1" 
      },
      "Fully Collected": { 
        label: "Fully Collected", 
        className: "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white border-green-600 shadow-md font-semibold px-3 py-1" 
      },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-500 text-white px-3 py-1" };
    
    return (
      <Badge className={`${config.className} border-2 rounded-full`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Approval for Collection</h1>
          <p className="text-muted-foreground mt-1">
            Approve orders with partial or postponed collection status from mobile app
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collection Approval List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by memo number, customer, PSO..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Partially Collected">Partially Collected</SelectItem>
                <SelectItem value="Postponed">Postponed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders found for collection approval</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Memo No.</TableHead>
                    <TableHead>Order No.</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>PSO</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order: CollectionOrder) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.memo_number || "—"}
                      </TableCell>
                      <TableCell>{order.order_number || "—"}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer_name}</div>
                          {order.customer_code && (
                            <div className="text-sm text-muted-foreground">{order.customer_code}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{order.pso_name}</TableCell>
                      <TableCell>
                        {new Date(order.delivery_date).toLocaleDateString()}
                      </TableCell>
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {(order.collection_status === "Pending" || 
                            order.collection_status === "Partially Collected" || 
                            order.collection_status === "Postponed") && (
                            <Button
                              size="sm"
                              onClick={() => handleApprove(order.id)}
                              disabled={approvingId === order.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {approvingId === order.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                              )}
                              Approve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

