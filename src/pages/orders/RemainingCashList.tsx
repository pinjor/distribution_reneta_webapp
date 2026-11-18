import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Search, 
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Truck,
  User,
  Package,
  FileBarChart,
  CheckCircle2,
  Clock,
  Loader2,
  Coins,
  Pause,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FilterSelect, OrderPageShell, OrderPanel, dialogContentClass, fieldClass, numberInputClass, panelClass, tableHeadClass } from "@/components/orders/orderMgmtUi";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


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

interface RemainingCashOrder {
  id: number;
  order_number?: string | null;
  memo_number?: string | null;
  customer_name: string;
  customer_code?: string | null;
  pso_name: string;
  pso_code?: string | null;
  delivery_date?: string | null;
  collection_status: string;
  collection_type?: string | null;
  collected_amount: number;
  pending_amount: number;
  total_amount: number;
  collection_approved?: boolean;
  loading_number?: string | null;
  loading_date?: string | null;
  area?: string | null;
  assigned_employee_name?: string | null;
  assigned_employee_code?: string | null;
  assigned_vehicle_registration?: string | null;
}

interface LoadingGroup {
  loading_number: string;
  loading_date?: string | null;
  area?: string | null;
  employee_name?: string | null;
  employee_code?: string | null;
  vehicle_registration?: string | null;
  orders: RemainingCashOrder[];
  total_orders: number;
  total_collected: number;
  total_pending: number;
  total_amount: number;
}

interface CollectionMemo {
  memo_number: string;
  collection_status: string;
  total_amount: number;
  collected_amount: number;
  remaining_amount: number;
  deposited_amount: number;
}

export default function RemainingCashList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "Remaining Cash and Collection | Renata";
  }, []);

  const [expandedLoadingNumbers, setExpandedLoadingNumbers] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCollectDialog, setShowCollectDialog] = useState(false);
  const [selectedLoadingGroup, setSelectedLoadingGroup] = useState<LoadingGroup | null>(null);
  const [collectionMemos, setCollectionMemos] = useState<CollectionMemo[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectingLoadingNumber, setCollectingLoadingNumber] = useState<string | null>(null);

  const { data: ordersData, isLoading: loading, refetch } = useQuery({
    queryKey: ['remaining-cash-list', statusFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (statusFilter && statusFilter !== "all") {
        params.status_filter = statusFilter;
      }
      const result = await apiEndpoints.orders.getRemainingCashList(params);
      return Array.isArray(result) ? result : (result?.data || result || []);
    },
  });

  const orders: RemainingCashOrder[] = Array.isArray(ordersData) ? ordersData : [];

  const filteredOrders = orders.filter((order: RemainingCashOrder) => {
    const term = searchTerm.toLowerCase();
    return (
      order.memo_number?.toLowerCase().includes(term) ||
      order.order_number?.toLowerCase().includes(term) ||
      order.customer_name.toLowerCase().includes(term) ||
      order.customer_code?.toLowerCase().includes(term) ||
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
          loading_date: order.loading_date || null,
          area: order.area || null,
          employee_name: order.assigned_employee_name || null,
          employee_code: order.assigned_employee_code || null,
          vehicle_registration: order.assigned_vehicle_registration || null,
          orders: [],
          total_orders: 0,
          total_collected: 0,
          total_pending: 0,
          total_amount: 0,
        };
      }
      
      groups[loadingNo].orders.push(order);
      groups[loadingNo].total_orders += 1;
      groups[loadingNo].total_collected += order.collected_amount;
      groups[loadingNo].total_pending += order.pending_amount;
      groups[loadingNo].total_amount += order.total_amount;
    });
    
    // Sort groups by loading_date (most recent first)
    return Object.values(groups).sort((a, b) => {
      const dateA = a.loading_date ? new Date(a.loading_date).getTime() : 0;
      const dateB = b.loading_date ? new Date(b.loading_date).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredOrders]);

  const toggleExpand = (loadingNumber: string) => {
    setExpandedLoadingNumbers((prev) => ({ ...prev, [loadingNumber]: !prev[loadingNumber] }));
  };

  const getStatusBadge = (status: string) => (
    <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", collectionBadgeClass(status))}>
      {status}
    </span>
  );

  const handleCollectClick = (group: LoadingGroup) => {
    // Check if all orders are fully collected (Pending with no pending amount)
    const allFullyCollected = group.orders.every(
      (order) => order.collection_status === "Pending" && (order.pending_amount === 0 || order.pending_amount < 0.01)
    );

    if (allFullyCollected) {
      // Directly collect without dialog
      handleCollectCash(group);
    } else {
      // Show dialog for mixed statuses
      setSelectedLoadingGroup(group);
      prepareCollectionMemos(group);
      setShowCollectDialog(true);
    }
  };

  const prepareCollectionMemos = (group: LoadingGroup) => {
    const memoList = group.orders.map((order) => {
      const memoNumber = order.memo_number || order.order_number || `order-${order.id}`;
      
      return {
        memo_number: memoNumber,
        collection_status: order.collection_status,
        total_amount: order.total_amount,
        collected_amount: order.collected_amount,
        remaining_amount: order.pending_amount,
        deposited_amount: order.collected_amount, // Default to collected amount
      };
    });
    
    setCollectionMemos(memoList);
  };

  const updateCollectionMemo = (memoNumber: string, field: 'collected_amount' | 'remaining_amount' | 'deposited_amount', value: number) => {
    setCollectionMemos((prev) =>
      prev.map((memo) => {
        if (memo.memo_number === memoNumber) {
          const updated = { ...memo, [field]: Math.max(0, value) };
          
          // If fully collected, remaining should be 0
          if (updated.collected_amount === updated.total_amount) {
            updated.remaining_amount = 0;
          }
          
          // Ensure collected + remaining doesn't exceed total
          const sum = updated.collected_amount + updated.remaining_amount;
          if (sum > updated.total_amount) {
            if (field === 'collected_amount') {
              updated.remaining_amount = Math.max(0, updated.total_amount - updated.collected_amount);
            } else {
              updated.collected_amount = Math.max(0, updated.total_amount - updated.remaining_amount);
            }
          }
          
          return updated;
        }
        return memo;
      })
    );
  };

  const handleCollectCash = async (group: LoadingGroup) => {
    setIsCollecting(true);
    setCollectingLoadingNumber(group.loading_number);
    
    try {
      const payload = {
        memos: collectionMemos.length > 0 ? collectionMemos.map(memo => ({
          memo_number: memo.memo_number,
          collected_amount: memo.collected_amount,
          remaining_amount: memo.remaining_amount,
          deposited_amount: memo.deposited_amount,
        })) : undefined,
      };

      await apiEndpoints.orders.collectRemainingCash(group.loading_number, payload);

      toast({
        title: "Cash collected successfully",
        description: `Collection approved for loading ${group.loading_number}. Money receipt will be printed.`,
      });

      // Print money receipt
      await handlePrintMoneyReceipt(group.loading_number);

      // Close dialog and refresh
      setShowCollectDialog(false);
      setSelectedLoadingGroup(null);
      setCollectionMemos([]);
      
      queryClient.invalidateQueries({ queryKey: ['remaining-cash-list'] });
      await refetch();
    } catch (error: any) {
      console.error("Failed to collect cash", error);
      toast({
        title: "Collection failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsCollecting(false);
      setCollectingLoadingNumber(null);
    }
  };

  const handleCollectWithDialog = async () => {
    if (!selectedLoadingGroup) return;
    await handleCollectCash(selectedLoadingGroup);
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
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast({ 
        title: "Money Receipt Printed", 
        description: `Money receipt for loading ${loadingNumber} downloaded.` 
      });
    } catch (error: any) {
      console.error("Failed to print money receipt", error);
      toast({ 
        title: "Printing failed", 
        description: error?.message || "Could not generate money receipt.", 
        variant: "destructive" 
      });
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
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
              { value: "Fully Collected", label: "Fully Collected", icon: CheckCircle2 },
              { value: "Partially Collected", label: "Partially Collected", icon: Coins },
              { value: "Pending", label: "Pending", icon: Clock },
              { value: "Postponed", label: "Cancelled/Postponed", icon: Pause },
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
            <p className="text-sm text-[#64748B]">Loading remaining cash list…</p>
          </OrderPanel>
        ) : loadingGroups.length === 0 ? (
          <OrderPanel className="flex flex-col items-center gap-2 py-10 text-center">
            <Package className="h-8 w-8 text-[#94A3B8]" />
            <p className="text-sm text-[#64748B]">No remaining cash orders found.</p>
          </OrderPanel>
        ) : (
          loadingGroups.map((group) => {
            const isExpanded = expandedLoadingNumbers[group.loading_number];
            const canCollect = group.orders.some((order) => !order.collection_approved);
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
                        {group.area && (
                          <span className="rounded-md bg-[#EAF2FC] px-1.5 py-0.5 text-[11px] font-semibold text-[#0C4DA1]">{group.area}</span>
                        )}
                        {!canCollect && (
                          <span className="rounded-md bg-[#ECFDF5] px-1.5 py-0.5 text-[11px] font-semibold text-[#047857]">Collected</span>
                        )}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[#64748B]">
                        <span>{formatDate(group.loading_date)}</span>
                        {group.employee_name && (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {group.employee_name} {group.employee_code ? `(${group.employee_code})` : ""}
                          </span>
                        )}
                        {group.vehicle_registration && (
                          <span className="inline-flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {group.vehicle_registration}
                          </span>
                        )}
                        <span>{group.total_orders} orders</span>
                        <span className="font-semibold text-[#172B4D] dark:text-[#F1F5F9]">৳{group.total_amount.toFixed(2)}</span>
                        <span className="font-semibold text-[#047857]">৳{group.total_collected.toFixed(2)}</span>
                        <span className="font-semibold text-[#C2410C]">৳{group.total_pending.toFixed(2)}</span>
                      </span>
                    </span>
                  </button>
                  {canCollect ? (
                    <Button
                      type="button"
                      variant="ntPrimary"
                      className="!h-8 shrink-0"
                      onClick={() => handleCollectClick(group)}
                      disabled={isCollecting && collectingLoadingNumber === group.loading_number}
                    >
                      {isCollecting && collectingLoadingNumber === group.loading_number ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Coins className="h-3.5 w-3.5" />
                      )}
                      {isCollecting && collectingLoadingNumber === group.loading_number ? "Collecting..." : "Collect"}
                    </Button>
                  ) : null}
                </div>

                {isExpanded && (
                  <div className="space-y-2 border-t border-[#E3EAF3] px-3 py-2.5 dark:border-[#2C3B50]">
                    <p className="text-xs font-medium text-[#64748B]">Memos ({group.orders.length})</p>
                    {group.orders.map((order) => (
                      <div key={order.id} className="flex items-center gap-3 rounded-lg border border-[#E3EAF3] px-3 py-2 dark:border-[#2C3B50]">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                              {order.memo_number || order.order_number || `order-${order.id}`}
                            </span>
                            {getStatusBadge(order.collection_status)}
                            {order.collection_approved && (
                              <span className="rounded-md bg-[#ECFDF5] px-1.5 py-0.5 text-[11px] font-semibold text-[#047857]">Approved</span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-[#64748B]">
                            <span>{order.customer_name} {order.customer_code ? `(${order.customer_code})` : ""}</span>
                            <span>{order.pso_name}{order.pso_code ? ` (${order.pso_code})` : ""}</span>
                            <span className="font-semibold text-[#172B4D] dark:text-[#F1F5F9]">৳{order.total_amount.toFixed(2)}</span>
                            <span className="font-semibold text-[#047857]">৳{order.collected_amount.toFixed(2)}</span>
                            <span className="font-semibold text-[#C2410C]">৳{order.pending_amount.toFixed(2)}</span>
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
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Dialog
        open={showCollectDialog}
        onOpenChange={(open) => {
          if (isCollecting) return;
          setShowCollectDialog(open);
        }}
      >
        <DialogContent
          className={cn(dialogContentClass, "max-w-[920px]")}
          onPointerDownOutside={(event) => {
            if (isCollecting) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (isCollecting) event.preventDefault();
          }}
        >
          <div className="border-b border-[#E3EAF3] px-5 py-4 dark:border-[#2C3B50]">
            <DialogHeader className="space-y-1 pr-6 text-left">
              <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                Collect remaining cash
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-[#64748B]">
                Adjust amounts for {selectedLoadingGroup?.loading_number}. A money receipt prints after collect.
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
                <p className="font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{selectedLoadingGroup?.employee_name || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#64748B]">Vehicle</p>
                <p className="font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{selectedLoadingGroup?.vehicle_registration || "—"}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#E3EAF3] dark:border-[#2C3B50]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={tableHeadClass}>Memo</TableHead>
                    <TableHead className={tableHeadClass}>Status</TableHead>
                    <TableHead className={cn(tableHeadClass, "text-right")}>Total</TableHead>
                    <TableHead className={cn(tableHeadClass, "text-right")}>Collected</TableHead>
                    <TableHead className={cn(tableHeadClass, "text-right")}>Remaining</TableHead>
                    <TableHead className={cn(tableHeadClass, "text-right")}>Deposited</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectionMemos.map((memo) => (
                    <TableRow key={memo.memo_number} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1B283B]">
                      <TableCell className="font-mono text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{memo.memo_number}</TableCell>
                      <TableCell>{getStatusBadge(memo.collection_status)}</TableCell>
                      <TableCell className="text-right text-[13px] font-medium tabular-nums">৳{memo.total_amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          max={memo.total_amount}
                          step="0.01"
                          value={memo.collected_amount}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updateCollectionMemo(memo.memo_number, "collected_amount", value);
                          }}
                          className={cn(fieldClass, numberInputClass, "ml-auto h-8 w-28 text-right")}
                          disabled={isCollecting}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {memo.collection_status === "Pending" && memo.remaining_amount === 0 ? (
                          <span className="text-[13px] font-medium tabular-nums">0</span>
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            max={memo.total_amount}
                            step="0.01"
                            value={memo.remaining_amount}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              updateCollectionMemo(memo.memo_number, "remaining_amount", value);
                            }}
                            className={cn(fieldClass, numberInputClass, "ml-auto h-8 w-28 text-right")}
                            disabled={isCollecting}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          max={memo.total_amount}
                          step="0.01"
                          value={memo.deposited_amount}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updateCollectionMemo(memo.memo_number, "deposited_amount", value);
                          }}
                          className={cn(fieldClass, numberInputClass, "ml-auto h-8 w-28 text-right")}
                          disabled={isCollecting}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-[12px] text-[#64748B]">
              Amounts are editable. Fully collected memos keep remaining cash at 0.
            </p>
          </div>

          <DialogFooter className="border-t border-[#E3EAF3] px-5 py-3 dark:border-[#2C3B50]">
            <Button type="button" variant="ntSecondary" onClick={() => setShowCollectDialog(false)} disabled={isCollecting}>
              Cancel
            </Button>
            <Button type="button" variant="ntPrimary" onClick={handleCollectWithDialog} disabled={isCollecting}>
              {isCollecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isCollecting ? "Collecting..." : "Collect Cash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OrderPageShell>
  );
}

