import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { 
  ChevronDown, 
  ChevronRight, 
  Truck, 
  User, 
  Package, 
  Loader2,
  Search,
  Filter,
  FileText,
  Download,
  ArrowLeft
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AssignedOrder {
  id: number;
  order_id: number;
  order_number?: string | null;
  customer_name: string;
  customer_code?: string | null;
  route_code?: string | null;
  route_name?: string | null;
  assigned_employee_id: number;
  assigned_employee_name: string;
  assigned_employee_code?: string | null;
  assigned_vehicle_id: number;
  assigned_vehicle_registration: string;
  assigned_vehicle_model?: string | null;
  assignment_date: string;
  loading_number?: string | null;
  loading_date?: string | null;
  area?: string | null;
  status: "Out for Delivery" | "Delivered" | "Pending";
  items_count: number;
  total_value: number;
}

interface LoadingGroup {
  loading_number: string;
  loading_date: string;
  area: string;
  employee_name: string;
  employee_code: string;
  vehicle_registration: string;
  vehicle_model: string;
  orders: AssignedOrder[];
  total_orders: number;
  total_value: number;
}

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const statusBadgeVariant = (status: AssignedOrder["status"]) => {
  switch (status) {
    case "Delivered":
      return "default";
    case "Out for Delivery":
      return "secondary";
    case "Pending":
      return "outline";
    default:
      return "outline";
  }
};

export default function AssignedOrderList() {
  const { toast } = useToast();
  const [expandedLoadingNumbers, setExpandedLoadingNumbers] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [routeFilter, setRouteFilter] = useState<string>("all");

  // Load routes for filter
  const { data: routesData } = useQuery({
    queryKey: ['routes'],
    queryFn: apiEndpoints.routes.getAll,
  });

  // Load assigned orders
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['assigned-orders', statusFilter, routeFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (statusFilter && statusFilter !== "all") {
        params.status_filter = statusFilter;
      }
      if (routeFilter && routeFilter !== "all") {
        params.route_code = routeFilter;
      }
      return await apiEndpoints.orders.getAssigned(params);
    },
  });

  const routes = routesData?.data || routesData || [];
  const orders: AssignedOrder[] = ordersData?.data || ordersData || [];

  // Filter orders first
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      !searchTerm ||
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.assigned_employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.assigned_vehicle_registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.loading_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Group orders by loading_number
  const loadingGroups = useMemo(() => {
    const groups: Record<string, LoadingGroup> = {};
    
    filteredOrders.forEach((order) => {
      const loadingNo = order.loading_number || `UNASSIGNED-${order.id}`;
      
      if (!groups[loadingNo]) {
        groups[loadingNo] = {
          loading_number: loadingNo,
          loading_date: order.loading_date || order.assignment_date.split('T')[0],
          area: order.area || order.route_name || "N/A",
          employee_name: order.assigned_employee_name,
          employee_code: order.assigned_employee_code || "",
          vehicle_registration: order.assigned_vehicle_registration,
          vehicle_model: order.assigned_vehicle_model || "",
          orders: [],
          total_orders: 0,
          total_value: 0,
        };
      }
      
      groups[loadingNo].orders.push(order);
      groups[loadingNo].total_orders += 1;
      groups[loadingNo].total_value += order.total_value;
    });
    
    // Sort by loading_date (most recent first), then by loading_number
    return Object.values(groups).sort((a, b) => {
      const dateA = new Date(a.loading_date).getTime();
      const dateB = new Date(b.loading_date).getTime();
      if (dateB !== dateA) {
        return dateB - dateA; // Most recent first
      }
      return b.loading_number.localeCompare(a.loading_number); // Then by loading number
    });
  }, [filteredOrders]);

  const toggleExpand = (loadingNumber: string) => {
    setExpandedLoadingNumbers((prev) => ({ ...prev, [loadingNumber]: !prev[loadingNumber] }));
  };

  const handleDownloadReport = async (loadingNumber: string) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost/api';
      const response = await fetch(`${apiUrl}/orders/loading-report/${encodeURIComponent(loadingNumber)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Loading_Report_${loadingNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Report downloaded",
        description: `Loading report ${loadingNumber} has been downloaded.`,
      });
    } catch (error: any) {
      console.error("Failed to download report", error);
      toast({
        title: "Download failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (orderId: number, newStatus: AssignedOrder["status"]) => {
    try {
      // This endpoint will be implemented in the backend
      await apiEndpoints.orders.updateAssignedStatus(orderId, { status: newStatus });
      toast({
        title: "Status updated",
        description: `Order status updated to ${newStatus}.`,
      });
      refetchOrders();
    } catch (error: any) {
      console.error("Failed to update status", error);
      toast({
        title: "Update failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const navigate = useNavigate();

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/orders")}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground">Assigned Order List</h1>
            <p className="text-muted-foreground">
              View and manage orders that have been assigned to employees and vehicles.
            </p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by order number, customer, employee, or vehicle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label htmlFor="route">Route</Label>
              <Select value={routeFilter} onValueChange={setRouteFilter}>
                <SelectTrigger id="route">
                  <SelectValue placeholder="All routes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All routes</SelectItem>
                  {routes.map((route: any) => (
                    <SelectItem key={route.id} value={route.code}>
                      {route.name} ({route.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading Groups List */}
      <Card>
        <CardHeader>
          <CardTitle>Loading Reports ({loadingGroups.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="text-sm">Loading orders…</p>
            </div>
          ) : loadingGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <Package className="h-10 w-10" />
              <p className="text-sm">No assigned orders found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {loadingGroups.map((group) => {
                const isExpanded = expandedLoadingNumbers[group.loading_number];
                return (
                  <div key={group.loading_number} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-card">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => toggleExpand(group.loading_number)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:text-foreground hover:bg-muted"
                          aria-label={isExpanded ? "Collapse loading" : "Expand loading"}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold text-foreground">Loading No: {group.loading_number}</span>
                            <Badge variant="outline">{group.area}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
                            <span>Date: {formatDate(group.loading_date)}</span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {group.employee_name} {group.employee_code ? `(${group.employee_code})` : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {group.vehicle_registration} {group.vehicle_model ? `(${group.vehicle_model})` : ""}
                            </span>
                            <span>Orders: {group.total_orders}</span>
                            <span>Total Value: ৳{group.total_value.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          onClick={() => handleDownloadReport(group.loading_number)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 whitespace-nowrap"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Report</span>
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t bg-muted/30">
                        <div className="pt-4">
                          <h4 className="text-sm font-semibold mb-3 text-foreground">
                            Invoices/Memos ({group.orders.length})
                          </h4>
                          {group.orders.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-4 text-center">
                              No orders found in this loading group.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {group.orders.map((order) => (
                                <div key={order.id} className="rounded-lg border bg-background p-3 shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="font-medium text-foreground">
                                          {order.order_number || `Order #${order.order_id}`}
                                        </span>
                                        <Badge variant={statusBadgeVariant(order.status)}>{order.status}</Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground space-x-4">
                                        <span>Customer: <span className="font-medium text-foreground">{order.customer_name}</span> {order.customer_code ? `(${order.customer_code})` : ''}</span>
                                        <span>Items: <span className="font-medium text-foreground">{order.items_count}</span></span>
                                        <span>Value: <span className="font-medium text-foreground">৳{order.total_value.toFixed(2)}</span></span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
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
    </main>
  );
}

