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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ChevronDown, 
  ChevronRight, 
  Truck, 
  User, 
  Package, 
  Loader2,
  Search,
  FileText,
  Download,
  ArrowLeft,
  PlusCircle,
  X,
  ScanLine,
  CheckCircle2,
  Clock,
  FileBarChart,
  MapPinned,
  Pause,
  XCircle,
  UserRound,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FilterSelect, OrderPageShell, OrderPanel, dialogContentClass, fieldClass, labelClass, numberInputClass, panelClass, requiredMark, selectItemClass, selectPanelClass, tableHeadClass } from "@/components/orders/orderMgmtUi";


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
  status: "Out for Delivery" | "Delivered" | "Pending" | "Rejected";
  delivery_status?: "Fully Delivered" | "Partial Delivered" | "Postponed" | "Rejected" | null;
  delivery_rejected?: boolean;
  delivery_rejected_reason?: string | null;
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
  status?: "Out for Delivery" | "Accepted" | "Rejected";
}

const personInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

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
  const queryClient = useQueryClient();
  
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
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

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
      if (statusFilter && statusFilter !== "all" && statusFilter !== "Accepted" && statusFilter !== "Rejected") {
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
      if (group.orders.some((order) => order.delivery_rejected)) {
        group.status = "Rejected";
        return;
      }

      // For demo: Show "Accepted" on some groups, rest as "Out for Delivery"
      // Use a combination of index and loading number to ensure variety
      // Show "Accepted" on odd indices (1, 3, 5...), "Out for Delivery" on even indices (0, 2, 4...)
      // Later, this will be based on actual acceptance status from database field
      
      // Determine status: every other group shows "Accepted"
      if (index % 2 === 1) {
        group.status = "Accepted";
        
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
          
          return {
            ...order,
            delivery_status: deliveryStatus,
          };
        });
      } else {
        group.status = "Out for Delivery";
      }
    });
    
    return sortedGroups;
  }, [filteredOrders]);

  const visibleLoadingGroups = useMemo(() => {
    if (statusFilter === "Accepted") {
      return loadingGroups.filter((group) => group.status === "Accepted");
    }
    if (statusFilter === "Rejected") {
      return loadingGroups.filter((group) => group.status === "Rejected");
    }
    return loadingGroups;
  }, [loadingGroups, statusFilter]);

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
      openReviewDialog(group);
    }
  };

  const handleRejectClick = (group: LoadingGroup) => {
    openReviewDialog(group);
  };

  const openReviewDialog = (group: LoadingGroup) => {
    setSelectedLoadingGroup(group);
    prepareApprovalMemos(group);
    setRejectReason("");
    setShowApprovalDialog(true);
  };

  const prepareApprovalMemos = (group: LoadingGroup) => {
    // Create memo-level summary with quantities
    const memoList = group.orders.map((order) => {
      const memoNumber = order.memo_number || order.order_number || `order-${order.order_id}`;
      
      const items = order.items || [];
      
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
      // Prepare memo list with quantities for fully delivered orders
      const memoList = group.orders.map((order) => {
        const memoNumber = order.memo_number || order.order_number || `order-${order.order_id}`;
        const items = order.items || [];
        const loadingQuantity = items.reduce((sum, item) => sum + item.total_quantity, 0);
        
        return {
          memo_number: memoNumber,
          delivered_quantity: loadingQuantity, // Fully delivered = all quantity
          returned_quantity: 0,
        };
      });
      
      // Call backend API to approve delivery
      await apiEndpoints.orders.approveDelivery({
        loading_number: group.loading_number,
        memos: memoList,
      });
      
      toast({
        title: "Delivery approved",
        description: `Loading ${group.loading_number} has been approved successfully.`,
      });
      
      // Auto-print loading report
      await handleDownloadReport(group.loading_number);
      
      // Invalidate cache for remaining cash list so orders appear immediately
      queryClient.invalidateQueries({ queryKey: ['remaining-cash-list'] });
      
      // Refetch orders to update status
      await refetchOrders();
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
    if (!selectedLoadingGroup) return;
    
    setIsApproving(true);
    try {
      // Prepare memo list with quantities
      const memoList = approvalMemos.map((memo) => ({
        memo_number: memo.memo_number,
        delivered_quantity: memo.delivered_quantity,
        returned_quantity: memo.returned_quantity,
      }));
      
      // Call backend API to approve delivery
      await apiEndpoints.orders.approveDelivery({
        loading_number: selectedLoadingGroup.loading_number,
        memos: memoList,
      });
      
      toast({
        title: "Partial delivery approved",
        description: `Loading ${selectedLoadingGroup.loading_number} has been approved with partial quantities.`,
      });
      
      // Auto-print loading report
      await handleDownloadReport(selectedLoadingGroup.loading_number);
      
      // Invalidate cache for remaining cash list so orders appear immediately
      queryClient.invalidateQueries({ queryKey: ['remaining-cash-list'] });
      
      setShowApprovalDialog(false);
      setSelectedLoadingGroup(null);
      setApprovalMemos([]);
      await refetchOrders();
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

  const handleRejectDelivery = async () => {
    if (!selectedLoadingGroup) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast({
        title: "Reason required",
        description: "Enter why this loading is being rejected.",
        variant: "destructive",
      });
      return;
    }

    setIsRejecting(true);
    try {
      await apiEndpoints.orders.rejectDelivery({
        loading_number: selectedLoadingGroup.loading_number,
        reason,
      });
      toast({
        title: "Delivery rejected",
        description: `Loading ${selectedLoadingGroup.loading_number} has been rejected.`,
      });
      setShowApprovalDialog(false);
      setSelectedLoadingGroup(null);
      setApprovalMemos([]);
      setRejectReason("");
      await refetchOrders();
    } catch (error: any) {
      console.error("Failed to reject delivery", error);
      toast({
        title: "Rejection failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const updateApprovalMemo = (memoNumber: string, deliveredValue: number) => {
    setApprovalMemos((prev) =>
      prev.map((memo) => {
        if (memo.memo_number === memoNumber) {
          const updated = { ...memo };
          // Only update delivered quantity (always editable)
          updated.delivered_quantity = Math.min(Math.max(0, deliveredValue), memo.loading_quantity);
          // Auto-calculate returned quantity (non-editable, read-only)
          updated.returned_quantity = Math.max(0, memo.loading_quantity - updated.delivered_quantity);
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
    <OrderPageShell>
      <OrderPanel className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64 shrink-0">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
              <Input
                id="search"
                aria-label="Search"
                placeholder="Search order, customer, employee, vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(fieldClass, "h-8 pl-8")}
              />
            </div>
            <FilterSelect
              id="status"
              label="Status"
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="All statuses"
              icon={Clock}
              triggerClassName="w-[8.75rem] min-w-0"
              items={[
                { value: "all", label: "All statuses", icon: Clock },
                { value: "Pending", label: "Pending", icon: Pause },
                { value: "Out for Delivery", label: "Out for Delivery", icon: Truck },
                { value: "Accepted", label: "Accepted", icon: CheckCircle2 },
                { value: "Rejected", label: "Rejected", icon: XCircle },
                { value: "Delivered", label: "Delivered", icon: Package },
              ]}
            />
            <FilterSelect
              id="route"
              label="Route"
              value={routeFilter}
              onValueChange={setRouteFilter}
              placeholder="All routes"
              icon={MapPinned}
              triggerClassName="w-[8.75rem] min-w-0"
              items={[
                { value: "all", label: "All routes", icon: MapPinned },
                ...routes.map((route: any) => ({
                  value: route.code,
                  label: `${route.name} (${route.code})`,
                  icon: MapPinned,
                })),
              ]}
            />
            <div className="ml-auto">
              <Button type="button" variant="ntPrimary" className="!h-8" onClick={() => setShowCreateForm(true)}>
                <PlusCircle className="h-3.5 w-3.5" />
                Create New Assigned Order List
              </Button>
            </div>
          </div>
      </OrderPanel>

      <div className="space-y-2">
          {ordersLoading ? (
            <OrderPanel className="flex flex-col items-center gap-2 py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0C4DA1]" />
              <p className="text-sm text-[#64748B]">Loading orders…</p>
            </OrderPanel>
          ) : visibleLoadingGroups.length === 0 ? (
            <OrderPanel className="flex flex-col items-center gap-2 py-10 text-center">
              <Package className="h-8 w-8 text-[#94A3B8]" />
              <p className="text-sm text-[#64748B]">No assigned orders found.</p>
            </OrderPanel>
          ) : (
            visibleLoadingGroups.map((group) => {
                const isExpanded = expandedLoadingNumbers[group.loading_number];
                return (
                  <div key={group.loading_number} className={cn(panelClass, "overflow-hidden")}>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(group.loading_number)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-90"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Collapse loading" : "Expand loading"}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#E3EAF3] text-[#64748B] dark:border-[#2C3B50]">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                              {group.loading_number}
                            </span>
                            {(group as any).route_codes && Array.isArray((group as any).route_codes) && (group as any).route_codes.length > 1 && (
                              <span className="text-[12px] font-normal text-[#64748B]">
                                ({((group as any).route_codes as string[]).join(", ")})
                              </span>
                            )}
                            {group.status === "Out for Delivery" && (
                              <span className="rounded-md bg-[#FFEDD5] px-1.5 py-0.5 text-[11px] font-semibold text-[#C2410C]">
                                Out for Delivery
                              </span>
                            )}
                            {group.status === "Accepted" && (
                              <span className="rounded-md bg-[#ECFDF5] px-1.5 py-0.5 text-[11px] font-semibold text-[#047857]">
                                Accepted
                              </span>
                            )}
                            {group.status === "Rejected" && (
                              <span className="rounded-md bg-[#FEE2E2] px-1.5 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
                                Rejected
                              </span>
                            )}
                            {(!(group as any).route_codes || !Array.isArray((group as any).route_codes) || (group as any).route_codes.length <= 1) && group.area && (
                              <span className="rounded-md bg-[#EAF2FC] px-1.5 py-0.5 text-[11px] font-semibold text-[#0C4DA1]">
                                {group.area}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[#64748B]">
                            <span>{formatDate(group.loading_date)}</span>
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {group.employee_name} {group.employee_code ? `(${group.employee_code})` : ""}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {group.vehicle_registration} {group.vehicle_model ? `(${group.vehicle_model})` : ""}
                            </span>
                            <span>{group.total_orders} orders</span>
                            <span className="font-semibold text-[#172B4D] dark:text-[#F1F5F9]">৳{group.total_value.toFixed(2)}</span>
                            {group.status === "Rejected" && group.orders[0]?.delivery_rejected_reason && (
                              <span className="text-[#B91C1C]">{group.orders[0].delivery_rejected_reason}</span>
                            )}
                          </span>
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          onClick={() => handleDownloadReport(group.loading_number)}
                          variant="ntSecondary"
                          className="!h-8"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Report
                        </Button>
                        {group.status === "Accepted" && (
                          <>
                            <Button
                              type="button"
                              onClick={() => handleRejectClick(group)}
                              variant="ntSecondary"
                              className="!h-8 border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                              disabled={isApproving || isRejecting}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleApproveClick(group)}
                              variant="ntPrimary"
                              className="!h-8"
                              disabled={isApproving || isRejecting}
                            >
                              {isApproving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              {isApproving ? "Approving..." : "Approve"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="space-y-2 border-t border-[#E3EAF3] px-3 py-2.5 dark:border-[#2C3B50]">
                          <p className="text-xs font-medium text-[#64748B]">
                            Invoices/Memos ({group.orders.length})
                          </p>
                          {group.orders.length === 0 ? (
                            <p className="py-3 text-center text-sm text-[#64748B]">
                              No orders found in this loading group.
                            </p>
                          ) : (
                            group.orders.map((order) => (
                                <div key={order.id} className="flex items-center gap-3 rounded-lg border border-[#E3EAF3] px-3 py-2 dark:border-[#2C3B50]">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                                          {order.memo_number || order.order_number || `order-${order.order_id}`}
                                        </span>
                                        {order.delivery_status === "Fully Delivered" && (
                                          <span className="rounded-md bg-[#ECFDF5] px-1.5 py-0.5 text-[11px] font-semibold text-[#047857]">
                                            Fully Delivered
                                          </span>
                                        )}
                                        {order.delivery_status === "Partial Delivered" && (
                                          <span className="rounded-md bg-[#FFEDD5] px-1.5 py-0.5 text-[11px] font-semibold text-[#C2410C]">
                                            Partial Delivered
                                          </span>
                                        )}
                                        {order.delivery_status === "Postponed" && (
                                          <span className="rounded-md bg-[#FEE2E2] px-1.5 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
                                            Postponed
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-[#64748B]">
                                        <span>{order.customer_name} {order.customer_code ? `(${order.customer_code})` : ""}</span>
                                        <span>{order.items_count} items</span>
                                        <span className="font-semibold text-[#172B4D] dark:text-[#F1F5F9]">৳{order.total_value.toFixed(2)}</span>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ntSecondary"
                                      className="!h-8 shrink-0"
                                      onClick={() => navigate(`/orders/mis-report?memo_id=${order.order_id}`)}
                                    >
                                      <FileBarChart className="h-3.5 w-3.5" />
                                      View in MIS
                                    </Button>
                                </div>
                            ))
                          )}
                      </div>
                    )}
                  </div>
                );
              })
          )}
      </div>

      <Dialog
        open={showCreateForm}
        onOpenChange={(open) => {
          if (isCreating) return;
          setShowCreateForm(open);
        }}
      >
        <DialogContent
          className={cn(dialogContentClass, "max-w-[560px]")}
          onPointerDownOutside={(event) => {
            if (isCreating) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (isCreating) event.preventDefault();
          }}
        >
          <div className="border-b border-[#E3EAF3] px-5 py-4 dark:border-[#2C3B50]">
            <DialogHeader className="space-y-1 pr-6 text-left">
              <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                Create assigned list
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-[#64748B]">
                Assign a DA and vehicle, then scan memo barcodes. A loading number is generated on create.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="employee-select" className={labelClass}>
                  Assign DA {requiredMark}
                </Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={isCreating}>
                  <SelectTrigger id="employee-select" className={cn(fieldClass, "h-10")}>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent className={selectPanelClass}>
                    {employees.filter((emp: any) => emp.is_active !== false).map((employee: any) => {
                      const fullName = `${employee.first_name}${employee.last_name ? ` ${employee.last_name}` : ""}`.trim();
                      const initials = personInitials(fullName);
                      return (
                        <SelectItem key={employee.id} value={String(employee.id)} className={selectItemClass}>
                          <span className="flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0C4DA1]/10 text-[9px] font-semibold text-[#0C4DA1]">
                              {initials || <UserRound className="h-3 w-3" />}
                            </span>
                            <span className="truncate">
                              {fullName} ({employee.employee_id})
                            </span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vehicle-select" className={labelClass}>
                  Assign vehicle {requiredMark}
                </Label>
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId} disabled={isCreating}>
                  <SelectTrigger id="vehicle-select" className={cn(fieldClass, "h-10")}>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent className={selectPanelClass}>
                    {vehicles.map((vehicle: any) => (
                      <SelectItem key={vehicle.id} value={String(vehicle.id)} className={selectItemClass}>
                        <span className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#0C4DA1] dark:bg-[#1B283B]">
                            <Truck className="h-3 w-3" />
                          </span>
                          <span className="truncate">
                            {vehicle.registration_number} {(vehicle.vehicle_type || vehicle.model) ? `(${vehicle.vehicle_type || vehicle.model})` : ""}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="barcode-input" className={labelClass}>Scan memo barcode</Label>
              <div className="relative">
                <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0C4DA1]" />
                <Input
                  id="barcode-input"
                  placeholder="Scan or type memo number and press Enter"
                  value={currentBarcodeInput}
                  onChange={(e) => setCurrentBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeScan}
                  className={cn(fieldClass, "h-10 pl-9")}
                  disabled={isCreating}
                />
              </div>
              <p className="text-[12px] text-[#64748B]">
                Press Enter after each scan to add it to the list.
              </p>
            </div>

            {scannedMemos.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]">
                  Scanned memos ({scannedMemos.length})
                </p>
                <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-[#E3EAF3] p-2 dark:border-[#2C3B50]">
                  {scannedMemos.map((memo) => (
                    <div key={memo} className="flex items-center justify-between rounded-lg bg-[#F8FBFF] px-2.5 py-1.5 dark:bg-[#1B283B]">
                      <span className="font-mono text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]">{memo}</span>
                      <button
                        type="button"
                        onClick={() => removeMemo(memo)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] hover:bg-white hover:text-[#B91C1C] dark:hover:bg-[#151F30]"
                        aria-label={`Remove ${memo}`}
                        disabled={isCreating}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-[#E3EAF3] px-5 py-3 dark:border-[#2C3B50]">
            <Button type="button" variant="ntSecondary" onClick={() => setShowCreateForm(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="button" variant="ntPrimary" onClick={handleCreateAssignedList} disabled={isCreating || scannedMemos.length === 0}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              {isCreating ? "Creating..." : "Create Assigned List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showApprovalDialog}
        onOpenChange={(open) => {
          if (isApproving || isRejecting) return;
          setShowApprovalDialog(open);
          if (!open) {
            setRejectReason("");
          }
        }}
      >
        <DialogContent
          className={cn(dialogContentClass, "max-w-[860px]")}
          onPointerDownOutside={(event) => {
            if (isApproving || isRejecting) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (isApproving || isRejecting) event.preventDefault();
          }}
        >
          <div className="border-b border-[#E3EAF3] px-5 py-4 dark:border-[#2C3B50]">
            <DialogHeader className="space-y-1 pr-6 text-left">
              <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                Review delivery
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-[#64748B]">
                Adjust delivered quantities for {selectedLoadingGroup?.loading_number}, then approve or reject this loading.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-[#E3EAF3] bg-[#F8FBFF] px-4 py-3 text-[13px] dark:border-[#2C3B50] dark:bg-[#1B283B] sm:grid-cols-4">
              <div>
                <p className="text-[11px] text-[#64748B]">Loading</p>
                <p className="font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{selectedLoadingGroup?.loading_number}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#64748B]">Date</p>
                <p className="font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{formatDate(selectedLoadingGroup?.loading_date)}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#64748B]">Employee</p>
                <p className="font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{selectedLoadingGroup?.employee_name}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#64748B]">Vehicle</p>
                <p className="font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{selectedLoadingGroup?.vehicle_registration}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#E3EAF3] dark:border-[#2C3B50]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={tableHeadClass}>Memo</TableHead>
                    <TableHead className={tableHeadClass}>Status</TableHead>
                    <TableHead className={cn(tableHeadClass, "text-right")}>Loading qty</TableHead>
                    <TableHead className={cn(tableHeadClass, "text-right")}>Delivered qty</TableHead>
                    <TableHead className={cn(tableHeadClass, "text-right")}>Returned qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalMemos.map((memo) => (
                    <TableRow key={memo.memo_number} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1B283B]">
                      <TableCell className="font-mono text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{memo.memo_number}</TableCell>
                      <TableCell>
                        {memo.delivery_status === "Fully Delivered" && (
                          <span className="rounded-md bg-[#ECFDF5] px-1.5 py-0.5 text-[11px] font-semibold text-[#047857]">
                            Fully Delivered
                          </span>
                        )}
                        {memo.delivery_status === "Partial Delivered" && (
                          <span className="rounded-md bg-[#FFEDD5] px-1.5 py-0.5 text-[11px] font-semibold text-[#C2410C]">
                            Partial Delivered
                          </span>
                        )}
                        {memo.delivery_status === "Postponed" && (
                          <span className="rounded-md bg-[#FEE2E2] px-1.5 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
                            Postponed
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-[13px] font-medium tabular-nums">{memo.loading_quantity}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          max={memo.loading_quantity}
                          value={memo.delivered_quantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            updateApprovalMemo(memo.memo_number, Math.min(value, memo.loading_quantity));
                          }}
                          className={cn(fieldClass, numberInputClass, "ml-auto h-8 w-24 text-right")}
                          disabled={isApproving || isRejecting}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={memo.returned_quantity}
                          readOnly
                          disabled
                          className={cn(fieldClass, numberInputClass, "ml-auto h-8 w-24 cursor-not-allowed bg-[#F8FAFC] text-right")}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-[12px] text-[#64748B]">
              Delivered quantity is editable. Returned quantity is Loading qty minus Delivered qty.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="reject-reason" className="text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]">
                Rejection reason
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Required only when rejecting this loading"
                className="min-h-[72px] rounded-lg border-[#CBD5E1] text-[13px] shadow-none focus-visible:border-[#0C4DA1] focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]"
                disabled={isApproving || isRejecting}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-[#E3EAF3] px-5 py-3 dark:border-[#2C3B50] sm:justify-between">
            <Button
              type="button"
              variant="ntSecondary"
              onClick={() => setShowApprovalDialog(false)}
              disabled={isApproving || isRejecting}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ntSecondary"
                className="border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                onClick={handleRejectDelivery}
                disabled={isApproving || isRejecting}
              >
                {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                {isRejecting ? "Rejecting..." : "Reject"}
              </Button>
              <Button
                type="button"
                variant="ntPrimary"
                onClick={handleApprovePartialDelivery}
                disabled={isApproving || isRejecting}
              >
                {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {isApproving ? "Approving..." : "Approve Delivery"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OrderPageShell>
  );
}

