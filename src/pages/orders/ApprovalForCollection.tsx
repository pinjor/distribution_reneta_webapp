import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  Search, 
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Truck,
  User,
  Package,
  FileBarChart,
  Clock,
  Coins,
  Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterSelect, OrderPageShell, OrderPanel, fieldClass, panelClass } from "@/components/orders/orderMgmtUi";


const collectionBadgeClass = (status: string) => {
  switch (status) {
    case "Fully Collected":
      return "bg-[#ECFDF5] text-[#047857]";
    case "Partially Collected":
      return "bg-[#FFEDD5] text-[#C2410C]";
    case "Postponed":
      return "bg-[#FEE2E2] text-[#B91C1C]";
    case "Pending":
      return "bg-[#EAF2FC] text-[#0C4DA1]";
    default:
      return "bg-[#F1F5F9] text-[#475569]";
  }
};

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

  const getStatusBadge = (status: string) => (
    <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", collectionBadgeClass(status))}>
      {status}
    </span>
  );

  const hasPendingApprovals = (group: LoadingGroup) => {
    return group.orders.some(order => 
      order.collection_status === "Pending" ||
      order.collection_status === "Partially Collected" ||
      order.collection_status === "Postponed"
    );
  };

  return (
    <OrderPageShell>
      <OrderPanel className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64 shrink-0">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
            <Input
              aria-label="Search"
              placeholder="Search by memo number, customer, loading number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(fieldClass, "h-8 pl-8")}
            />
          </div>
          <FilterSelect
            label="Status"
            value={statusFilter}
            onValueChange={setStatusFilter}
            placeholder="All statuses"
            icon={Coins}
            triggerClassName="w-[10.5rem] min-w-0"
            items={[
              { value: "all", label: "All statuses", icon: Coins },
              { value: "Pending", label: "Pending", icon: Clock },
              { value: "Partially Collected", label: "Partially Collected", icon: Coins },
              { value: "Postponed", label: "Postponed", icon: Pause },
            ]}
          />
          <Button type="button" variant="ntSecondary" className="!h-8 ml-auto" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </OrderPanel>

      <div className="space-y-2">
        {loading ? (
          <OrderPanel className="flex flex-col items-center gap-2 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0C4DA1]" />
            <p className="text-sm text-[#64748B]">Loading orders…</p>
          </OrderPanel>
        ) : loadingGroups.length === 0 ? (
          <OrderPanel className="flex flex-col items-center gap-2 py-10 text-center">
            <Package className="h-8 w-8 text-[#94A3B8]" />
            <p className="text-sm text-[#64748B]">No orders found for collection approval.</p>
          </OrderPanel>
        ) : (
          loadingGroups.map((group) => {
            const isExpanded = expandedLoadingNumbers[group.loading_number];
            const hasPending = hasPendingApprovals(group);
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
                        <span className="text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{group.loading_number}</span>
                        {group.area && group.area !== "N/A" && (
                          <span className="rounded-md bg-[#EAF2FC] px-1.5 py-0.5 text-[11px] font-semibold text-[#0C4DA1]">{group.area}</span>
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
                          {group.vehicle_registration}
                        </span>
                        <span>{group.total_orders} orders</span>
                        <span className="font-semibold text-[#172B4D] dark:text-[#F1F5F9]">৳{group.total_amount.toFixed(2)}</span>
                        <span className="font-semibold text-[#047857]">৳{group.total_collected.toFixed(2)}</span>
                        <span className="font-semibold text-[#C2410C]">৳{group.total_pending.toFixed(2)}</span>
                      </span>
                    </span>
                  </button>
                  {hasPending && (
                    <Button
                      type="button"
                      variant="ntPrimary"
                      className="!h-8 shrink-0"
                      onClick={() => handleApproveLoading(group.loading_number)}
                      disabled={approvingLoadingNumber === group.loading_number}
                    >
                      {approvingLoadingNumber === group.loading_number ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {approvingLoadingNumber === group.loading_number ? "Approving..." : "Approve"}
                    </Button>
                  )}
                </div>

                {isExpanded && (
                  <div className="space-y-2 border-t border-[#E3EAF3] px-3 py-2.5 dark:border-[#2C3B50]">
                    <p className="text-xs font-medium text-[#64748B]">Memos ({group.orders.length})</p>
                    {group.orders.length === 0 ? (
                      <p className="py-3 text-center text-sm text-[#64748B]">No orders found in this loading group.</p>
                    ) : (
                      group.orders.map((order) => (
                        <div key={order.id} className="flex items-center gap-3 rounded-lg border border-[#E3EAF3] px-3 py-2 dark:border-[#2C3B50]">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                                {order.memo_number || order.order_number || `order-${order.id}`}
                              </span>
                              {getStatusBadge(order.collection_status)}
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-[#64748B]">
                              <span>{order.customer_name} {order.customer_code ? `(${order.customer_code})` : ""}</span>
                              <span>{order.pso_name}</span>
                              <span>{formatDate(order.delivery_date)}</span>
                              <span className="font-semibold text-[#172B4D] dark:text-[#F1F5F9]">৳{Number(order.total_amount || 0).toFixed(2)}</span>
                              <span className="font-semibold text-[#047857]">৳{Number(order.collected_amount || 0).toFixed(2)}</span>
                              <span className="font-semibold text-[#C2410C]">৳{Number(order.pending_amount || 0).toFixed(2)}</span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ntSecondary"
                            className="!h-8 shrink-0"
                            onClick={() => navigate(`/orders/mis-report?memo_id=${order.id}`)}
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
    </OrderPageShell>
  );
}