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
  ArrowLeft,
  PlusCircle,
  X,
  ScanLine,
  CheckCircle2
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AssignedOrder {
  id: number;
  order_id: number;
  order_number?: string | null;
  memo_number?: string | null;
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
  delivery_status?: "Fully Delivered" | "Partial Delivered" | "Postponed" | null;
  items_count: number;
  total_value: number;
  items?: Array<{
    product_code: string;
    product_name: string;
    total_quantity: number;
  }>;
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
  status?: "Out for Delivery" | "Accepted"; // Status for the loading group
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
  
  useEffect(() => {
    document.title = "Assigned Order List | Renata";
  }, []);

  const [expandedLoadingNumbers, setExpandedLoadingNumbers] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [routeFilter, setRouteFilter] = useState<string>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [scannedMemos, setScannedMemos] = useState<string[]>([]);
  const [currentBarcodeInput, setCurrentBarcodeInput] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedLoadingGroup, setSelectedLoadingGroup] = useState<LoadingGroup | null>(null);
  const [approvalMemos, setApprovalMemos] = useState<Array<{
    memo_number: string;
    delivery_status: "Fully Delivered" | "Partial Delivered" | "Postponed";
    loading_quantity: number;
    delivered_quantity: number;
    returned_quantity: number;
  }>>([]);
  const [isApproving, setIsApproving] = useState(false);

  // Load routes for filter
  const { data: routesData } = useQuery({
    queryKey: ['routes'],
    queryFn: apiEndpoints.routes.getAll,
  });

  // Load employees for assignment
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: apiEndpoints.employees.getAll,
  });

  // Load vehicles for assignment
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: apiEndpoints.vehicles.getAll,
  });

  const employees = employeesData?.data || employeesData || [];
  const vehicles = (vehiclesData?.data || vehiclesData || []).filter((v: any) => v.is_active !== false);

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
      order.memo_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    
    // Extract unique route codes for each group
    Object.values(groups).forEach((group) => {
      const routeCodes = [...new Set(group.orders.map((o: any) => o.route_code).filter(Boolean))];
      (group as any).route_codes = routeCodes;
    });
    
    // Sort by loading_date (most recent first), then by loading_number
    const sortedGroups = Object.values(groups).sort((a, b) => {
      const dateA = new Date(a.loading_date).getTime();
      const dateB = new Date(b.loading_date).getTime();
      if (dateB !== dateA) {
        return dateB - dateA; // Most recent first
      }
      return b.loading_number.localeCompare(a.loading_number); // Then by loading number
    });
    
    // Determine status for each group after sorting (for demo purposes)
    sortedGroups.forEach((group, index) => {
      // For demo: Show "Accepted" on some groups, rest as "Out for Delivery"
      // Use a combination of index and loading number to ensure variety
      // Show "Accepted" on odd indices (1, 3, 5...), "Out for Delivery" on even indices (0, 2, 4...)
      // Later, this will be based on actual acceptance status from database field
      
      // Determine status: every other group shows "Accepted"
      if (index % 2 === 1) {
        (group as any).status = "Accepted";
        
        // Add demo delivery statuses to orders in Accepted groups
        // Mix of Fully Delivered, Partial Delivered, and Postponed to test all scenarios
        group.orders = group.orders.map((order, orderIndex) => {
          let deliveryStatus: "Fully Delivered" | "Partial Delivered" | "Postponed" = "Fully Delivered";
          
          // Create variety: first is full, second is partial, third is postponed, then cycle
          if (group.orders.length > 1) {
            if (orderIndex === 1) {
              deliveryStatus = "Partial Delivered";
            } else if (orderIndex === 2) {
              deliveryStatus = "Postponed";
            } else if (orderIndex > 2) {
              // Cycle: 3=partial, 4=postponed, 5=partial, etc.
              const statusIndex = orderIndex % 3;
              if (statusIndex === 0) deliveryStatus = "Fully Delivered";
              else if (statusIndex === 1) deliveryStatus = "Partial Delivered";
              else deliveryStatus = "Postponed";
            }
          }
          
          // Add demo items if not available
          const items = order.items || [
            { product_code: "PROD001", product_name: "Product A", total_quantity: 100 },
            { product_code: "PROD002", product_name: "Product B", total_quantity: 50 },
            { product_code: "PROD003", product_name: "Product C", total_quantity: 75 },
          ];
          
          return {
            ...order,
            delivery_status: deliveryStatus,
            items: items,
          };
        });
      } else {
        (group as any).status = "Out for Delivery";
      }
    });
    
    return sortedGroups;
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

  const handleApproveClick = (group: LoadingGroup) => {
    // Check if all orders are fully delivered
    const allFullyDelivered = group.orders.every(
      (order) => order.delivery_status === "Fully Delivered"
    );
    
    if (allFullyDelivered) {
      // Direct approval for fully delivered orders
      handleApproveDelivery(group);
    } else {
      // Show popup for partial/postponed deliveries
      setSelectedLoadingGroup(group);
      prepareApprovalMemos(group);
      setShowApprovalDialog(true);
    }
  };

  const prepareApprovalMemos = (group: LoadingGroup) => {
    // Create memo-level summary with quantities
    const memoList = group.orders.map((order) => {
      const memoNumber = order.memo_number || order.order_number || `Order #${order.order_id}`;
      
      // Calculate total quantity from items
      const items = order.items || [
        { product_code: "PROD001", product_name: "Product 1", total_quantity: 100 },
        { product_code: "PROD002", product_name: "Product 2", total_quantity: 50 },
        { product_code: "PROD003", product_name: "Product 3", total_quantity: 75 },
      ];
      
      const loadingQuantity = items.reduce((sum, item) => sum + item.total_quantity, 0);
      let deliveredQuantity = 0;
      let returnedQuantity = 0;
      
      if (order.delivery_status === "Fully Delivered") {
        deliveredQuantity = loadingQuantity;
        returnedQuantity = 0;
      } else if (order.delivery_status === "Partial Delivered") {
        // Demo: 70% delivered, 30% returned
        deliveredQuantity = Math.floor(loadingQuantity * 0.7);
        returnedQuantity = loadingQuantity - deliveredQuantity;
      } else if (order.delivery_status === "Postponed") {
        // Demo: 0% delivered (postponed), 100% returned
        deliveredQuantity = 0;
        returnedQuantity = loadingQuantity;
      }
      
      return {
        memo_number: memoNumber,
        delivery_status: order.delivery_status || "Fully Delivered",
        loading_quantity: loadingQuantity,
        delivered_quantity: deliveredQuantity,
        returned_quantity: returnedQuantity,
      };
    });
    
    setApprovalMemos(memoList);
  };

  const handleApproveDelivery = async (group: LoadingGroup) => {
    setIsApproving(true);
    try {
      // TODO: Call backend API to approve delivery
      // await apiEndpoints.orders.approveDelivery(group.loading_number);
      
      toast({
        title: "Delivery approved",
        description: `Loading ${group.loading_number} has been approved successfully.`,
      });
      
      // Refetch orders to update status
      refetchOrders();
    } catch (error: any) {
      console.error("Failed to approve delivery", error);
      toast({
        title: "Approval failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleApprovePartialDelivery = async () => {
    setIsApproving(true);
    try {
      // TODO: Call backend API to approve partial delivery with quantities
      // await apiEndpoints.orders.approvePartialDelivery({
      //   loading_number: selectedLoadingGroup?.loading_number,
      //   memos: approvalMemos,
      // });
      
      toast({
        title: "Partial delivery approved",
        description: `Loading ${selectedLoadingGroup?.loading_number} has been approved with partial quantities.`,
      });
      
      setShowApprovalDialog(false);
      setSelectedLoadingGroup(null);
      setApprovalMemos([]);
      refetchOrders();
    } catch (error: any) {
      console.error("Failed to approve partial delivery", error);
      toast({
        title: "Approval failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const updateApprovalMemo = (memoNumber: string, field: 'delivered_quantity' | 'returned_quantity', value: number) => {
    setApprovalMemos((prev) =>
      prev.map((memo) => {
        if (memo.memo_number === memoNumber) {
          const updated = { ...memo, [field]: value };
          // Auto-calculate returned quantity if delivered quantity changes
          if (field === 'delivered_quantity') {
            updated.returned_quantity = Math.max(0, updated.loading_quantity - value);
          }
          // Auto-calculate delivered quantity if returned quantity changes
          if (field === 'returned_quantity') {
            updated.delivered_quantity = Math.max(0, updated.loading_quantity - value);
          }
          return updated;
        }
        return memo;
      })
    );
  };

  const navigate = useNavigate();

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentBarcodeInput.trim()) {
      const memoNumber = currentBarcodeInput.trim();
      if (!scannedMemos.includes(memoNumber)) {
        setScannedMemos([...scannedMemos, memoNumber]);
        setCurrentBarcodeInput("");
      } else {
        toast({
          title: "Duplicate memo",
          description: `Memo ${memoNumber} has already been scanned.`,
          variant: "destructive",
        });
      }
    }
  };

  const removeMemo = (memoNumber: string) => {
    setScannedMemos(scannedMemos.filter(m => m !== memoNumber));
  };

  const handleCreateAssignedList = async () => {
    if (scannedMemos.length === 0) {
      toast({
        title: "No memos scanned",
        description: "Please scan at least one memo number.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedEmployeeId) {
      toast({
        title: "Employee required",
        description: "Please select an employee.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedVehicleId) {
      toast({
        title: "Vehicle required",
        description: "Please select a vehicle.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      // This endpoint will be created in the backend
      const response = await apiEndpoints.orders.createAssignedFromBarcodes({
        memo_numbers: scannedMemos,
        employee_id: Number(selectedEmployeeId),
        vehicle_id: Number(selectedVehicleId),
      });
      
      toast({
        title: "Assigned order list created",
        description: `Successfully created assigned order list with loading number ${response.loading_number}.`,
      });
      
      // Reset form
      setShowCreateForm(false);
      setScannedMemos([]);
      setCurrentBarcodeInput("");
      setSelectedEmployeeId("");
      setSelectedVehicleId("");
      
      // Refresh orders list
      refetchOrders();
    } catch (error: any) {
      console.error("Failed to create assigned list", error);
      toast({
        title: "Creation failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/orders/route-wise")}
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
          <Button onClick={() => setShowCreateForm(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Assigned Order List
          </Button>
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
                            <span className="text-lg font-semibold text-foreground">
                              Loading No: {group.loading_number}
                              {(group as any).route_codes && Array.isArray((group as any).route_codes) && (group as any).route_codes.length > 1 && (
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                  ({((group as any).route_codes as string[]).join(', ')})
                                </span>
                              )}
                            </span>
                            {/* Status Tags */}
                            {(group as any).status === "Out for Delivery" && (
                              <span 
                                className="inline-flex items-center rounded-full text-white px-3 py-1 text-xs font-bold shadow-lg ring-2 ring-orange-300/60"
                                style={{ backgroundColor: '#f97316' }}
                              >
                                Out for Delivery
                              </span>
                            )}
                            {(group as any).status === "Accepted" && (
                              <span 
                                className="inline-flex items-center rounded-full text-white px-3 py-1 text-xs font-bold shadow-lg ring-2 ring-emerald-300/60"
                                style={{ backgroundColor: '#10b981' }}
                              >
                                Accepted
                              </span>
                            )}
                            {(!(group as any).route_codes || !Array.isArray((group as any).route_codes) || (group as any).route_codes.length <= 1) && group.area && (
                              <Badge variant="outline">{group.area}</Badge>
                            )}
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
                        {(group as any).status === "Accepted" && (
                          <Button
                            onClick={() => handleApproveClick(group)}
                            size="sm"
                            className="flex items-center gap-2 whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
                            disabled={isApproving}
                          >
                            {isApproving ? (
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
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="font-medium text-foreground">
                                          {order.memo_number || order.order_number || `Order #${order.order_id}`}
                                        </span>
                                        {/* Delivery Status Tags */}
                                        {order.delivery_status === "Fully Delivered" && (
                                          <span className="inline-flex items-center rounded-full text-white font-bold text-xs px-2.5 py-1 shadow-lg ring-2 ring-green-400/60" style={{ backgroundColor: '#059669' }}>
                                            Fully Delivered
                                          </span>
                                        )}
                                        {order.delivery_status === "Partial Delivered" && (
                                          <span className="inline-flex items-center rounded-full text-white font-bold text-xs px-2.5 py-1 shadow-lg ring-2 ring-orange-400/60" style={{ backgroundColor: '#ea580c' }}>
                                            Partial Delivered
                                          </span>
                                        )}
                                        {order.delivery_status === "Postponed" && (
                                          <span className="inline-flex items-center rounded-full text-white font-bold text-xs px-2.5 py-1 shadow-lg ring-2 ring-pink-400/60" style={{ backgroundColor: '#dc2626' }}>
                                            Postponed
                                          </span>
                                        )}
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

      {/* Create New Assigned Order List Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Assigned Order List</DialogTitle>
            <DialogDescription>
              Scan multiple memo barcodes and assign them to an employee and vehicle. A new loading number will be generated.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="employee-select">Assign DA (Employee) *</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger id="employee-select">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter((emp: any) => emp.is_active !== false).map((employee: any) => {
                    const fullName = `${employee.first_name}${employee.last_name ? ` ${employee.last_name}` : ''}`.trim();
                    return (
                      <SelectItem key={employee.id} value={String(employee.id)}>
                        {fullName} ({employee.employee_id})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Vehicle Selection */}
            <div className="space-y-2">
              <Label htmlFor="vehicle-select">Assign Vehicle *</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger id="vehicle-select">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle: any) => (
                    <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                      {vehicle.registration_number} {(vehicle.vehicle_type || vehicle.model) ? `(${vehicle.vehicle_type || vehicle.model})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Barcode Scanner Input */}
            <div className="space-y-2">
              <Label htmlFor="barcode-input">Scan Memo Barcode</Label>
              <div className="relative">
                <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="barcode-input"
                  placeholder="Scan or type memo number and press Enter"
                  value={currentBarcodeInput}
                  onChange={(e) => setCurrentBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeScan}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Type or scan memo number and press Enter to add it to the list
              </p>
            </div>

            {/* Scanned Memos List */}
            {scannedMemos.length > 0 && (
              <div className="space-y-2">
                <Label>Scanned Memos ({scannedMemos.length})</Label>
                <div className="border rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                  {scannedMemos.map((memo, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="font-mono text-sm">{memo}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMemo(memo)}
                        className="h-6 w-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateForm(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateAssignedList} disabled={isCreating || scannedMemos.length === 0}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Assigned List
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partial/Postponed Delivery Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve Delivery</DialogTitle>
            <DialogDescription>
              Review and adjust delivered quantities for loading {selectedLoadingGroup?.loading_number}. 
              Full deliveries are auto-filled. Partial and postponed deliveries can be edited.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Loading Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Loading Number:</span>{" "}
                  <span className="font-medium">{selectedLoadingGroup?.loading_number}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  <span className="font-medium">{formatDate(selectedLoadingGroup?.loading_date)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Employee:</span>{" "}
                  <span className="font-medium">{selectedLoadingGroup?.employee_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Vehicle:</span>{" "}
                  <span className="font-medium">{selectedLoadingGroup?.vehicle_registration}</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Memo Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Loading Quantity</TableHead>
                    <TableHead className="text-right">Delivered Quantity</TableHead>
                    <TableHead className="text-right">Returned Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalMemos.map((memo, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm font-medium">{memo.memo_number}</TableCell>
                      <TableCell>
                        {memo.delivery_status === "Fully Delivered" && (
                          <span className="inline-flex items-center rounded-full text-white font-bold text-xs px-2 py-1 shadow-lg ring-2 ring-green-400/60" style={{ backgroundColor: '#059669' }}>
                            Fully Delivered
                          </span>
                        )}
                        {memo.delivery_status === "Partial Delivered" && (
                          <span className="inline-flex items-center rounded-full text-white font-bold text-xs px-2 py-1 shadow-lg ring-2 ring-orange-400/60" style={{ backgroundColor: '#ea580c' }}>
                            Partial Delivered
                          </span>
                        )}
                        {memo.delivery_status === "Postponed" && (
                          <span className="inline-flex items-center rounded-full text-white font-bold text-xs px-2 py-1 shadow-lg ring-2 ring-pink-400/60" style={{ backgroundColor: '#dc2626' }}>
                            Postponed
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{memo.loading_quantity}</TableCell>
                      <TableCell className="text-right">
                        {memo.delivery_status === "Fully Delivered" ? (
                          <span className="font-medium">{memo.delivered_quantity}</span>
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            max={memo.loading_quantity}
                            value={memo.delivered_quantity}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              updateApprovalMemo(memo.memo_number, 'delivered_quantity', Math.min(value, memo.loading_quantity));
                            }}
                            className="w-24 ml-auto text-right"
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {memo.delivery_status === "Fully Delivered" ? (
                          <span className="font-medium">0</span>
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            max={memo.loading_quantity}
                            value={memo.returned_quantity}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              updateApprovalMemo(memo.memo_number, 'returned_quantity', Math.min(value, memo.loading_quantity));
                            }}
                            className="w-24 ml-auto text-right"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> For full deliveries, quantities are auto-filled. For partial and postponed deliveries, 
                returned quantity is automatically calculated as (Loading Quantity - Delivered), but you can edit it manually.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)} disabled={isApproving}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprovePartialDelivery} 
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve Delivery
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

