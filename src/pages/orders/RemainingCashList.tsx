import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Search, 
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Truck,
  User,
  Package,
  FileBarChart,
  Calendar,
  CheckCircle2,
  Loader2,
  Coins,
} from "lucide-react";
import { OrderBreadcrumb } from "@/components/layout/OrderBreadcrumb";
import { format } from "date-fns";
import { TAG_COLORS } from "@/lib/tagColors";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";

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
          <h1 className="text-2xl font-semibold text-foreground">Remaining Cash and Collection</h1>
          <p className="text-muted-foreground mt-1">
            Orders after delivery approval, grouped by loading number. Shows fully collected, partially collected, and cancelled/postponed memos.
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
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Fully Collected">Fully Collected</SelectItem>
                  <SelectItem value="Partially Collected">Partially Collected</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Postponed">Cancelled/Postponed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading Groups */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading remaining cash list...</p>
          </CardContent>
        </Card>
      ) : loadingGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No orders found in remaining cash and collection list.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Orders will appear here after approval from Assigned Order List.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {loadingGroups.map((group) => {
            const isExpanded = expandedLoadingNumbers[group.loading_number];
            
            return (
              <Card key={group.loading_number} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleExpand(group.loading_number)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">
                            Loading: {group.loading_number}
                          </CardTitle>
                          {group.loading_date && (
                            <Badge variant="outline" className="font-normal">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(group.loading_date), "MMM dd, yyyy")}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {group.employee_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {group.employee_name} ({group.employee_code})
                            </span>
                          )}
                          {group.vehicle_registration && (
                            <span className="flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {group.vehicle_registration}
                            </span>
                          )}
                          {group.area && (
                            <span>Area: {group.area}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Orders</div>
                        <div className="text-lg font-semibold">{group.total_orders}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Total Amount</div>
                        <div className="text-lg font-semibold">৳{group.total_amount.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Collected</div>
                        <div className="text-lg font-semibold text-green-600">৳{group.total_collected.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Pending</div>
                        <div className="text-lg font-semibold text-orange-600">৳{group.total_pending.toFixed(2)}</div>
                      </div>
                      {group.orders.some(o => !o.collection_approved) ? (
                        <Button
                          onClick={() => handleCollectClick(group)}
                          size="sm"
                          className="flex items-center gap-2 whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
                          disabled={isCollecting && collectingLoadingNumber === group.loading_number}
                        >
                          {isCollecting && collectingLoadingNumber === group.loading_number ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Collecting...
                            </>
                          ) : (
                            <>
                              <Coins className="h-4 w-4" />
                              Collect
                            </>
                          )}
                        </Button>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Collected
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {group.orders.map((order) => (
                        <Card key={order.id} className="bg-muted/30">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="font-semibold">
                                    {order.order_number || `order-${order.id}`}
                                  </span>
                                  {order.memo_number && (
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {order.memo_number}
                                    </Badge>
                                  )}
                                  {getStatusBadge(order.collection_status)}
                                  {order.collection_approved && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      Approved
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Customer:</span>
                                    <div className="font-medium">{order.customer_name}</div>
                                    {order.customer_code && (
                                      <div className="text-xs text-muted-foreground">{order.customer_code}</div>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">PSO:</span>
                                    <div className="font-medium">{order.pso_name}</div>
                                    {order.pso_code && (
                                      <div className="text-xs text-muted-foreground">{order.pso_code}</div>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Amounts:</span>
                                    <div className="font-medium">Total: ৳{order.total_amount.toFixed(2)}</div>
                                    <div className="text-xs text-green-600">Collected: ৳{order.collected_amount.toFixed(2)}</div>
                                    <div className="text-xs text-orange-600">Pending: ৳{order.pending_amount.toFixed(2)}</div>
                                  </div>
                                  {order.delivery_date && (
                                    <div>
                                      <span className="text-muted-foreground">Delivery Date:</span>
                                      <div className="font-medium">{format(new Date(order.delivery_date), "MMM dd, yyyy")}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/orders/mis-report?memo_id=${order.id}`)}
                                className="ml-4"
                              >
                                <FileBarChart className="h-4 w-4 mr-2" />
                                View in MIS Report
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Collect Dialog */}
      <Dialog open={showCollectDialog} onOpenChange={setShowCollectDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Collect Remaining Cash</DialogTitle>
            <DialogDescription>
              Review and adjust collection amounts for loading {selectedLoadingGroup?.loading_number}. 
              Fully collected orders will have remaining amount = 0.
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
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Collected Cash</TableHead>
                    <TableHead className="text-right">Remaining Cash</TableHead>
                    <TableHead className="text-right">Deposited Cash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectionMemos.map((memo, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm font-medium">{memo.memo_number}</TableCell>
                      <TableCell>
                        {getStatusBadge(memo.collection_status)}
                      </TableCell>
                      <TableCell className="text-right font-medium">৳{memo.total_amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          max={memo.total_amount}
                          step="0.01"
                          value={memo.collected_amount}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updateCollectionMemo(memo.memo_number, 'collected_amount', value);
                          }}
                          className="w-32 ml-auto text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {memo.collection_status === "Pending" && memo.remaining_amount === 0 ? (
                          <span className="font-medium">0</span>
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            max={memo.total_amount}
                            step="0.01"
                            value={memo.remaining_amount}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              updateCollectionMemo(memo.memo_number, 'remaining_amount', value);
                            }}
                            className="w-32 ml-auto text-right"
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
                            updateCollectionMemo(memo.memo_number, 'deposited_amount', value);
                          }}
                          className="w-32 ml-auto text-right"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> All amounts are editable. For fully collected orders, remaining cash will be set to 0. 
                After approval, a money receipt will be automatically printed.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCollectDialog(false)} disabled={isCollecting}>
              Cancel
            </Button>
            <Button 
              onClick={handleCollectWithDialog} 
              disabled={isCollecting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCollecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Collecting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Collect Cash
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

