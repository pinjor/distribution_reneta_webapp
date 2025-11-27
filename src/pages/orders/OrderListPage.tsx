import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { masterData } from "@/lib/masterData";
import { ChevronDown, ChevronRight, Pencil, ClipboardList, Truck, Filter, X } from "lucide-react";

interface ApiOrderItem {
  id: number;
  product_code: string;  // Renamed from old_code
  product_name: string;
  pack_size?: string | null;
  quantity: number;
  free_goods?: number | null;
  total_quantity?: number | null;
  trade_price: number;
  unit_price?: number | null;
  discount_percent?: number | null;
  batch_number?: string | null;  // Added
  current_stock?: number | null;  // Added
  delivery_date: string;
  selected?: boolean | null;
}

interface ApiOrder {
  id: number;
  order_number?: string | null;
  depot_code: string;
  depot_name: string;
  route_code?: string | null;
  route_name?: string | null;
  customer_id: string;
  customer_name: string;
  customer_code?: string | null;
  pso_id: string;
  pso_name: string;
  pso_code?: string | null;
  delivery_date: string;
  status: "Draft" | "Submitted" | "Approved" | "Partially Approved";
  notes?: string | null;
  items: ApiOrderItem[];
}

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const statusBadgeVariant = (status: ApiOrder["status"]) => {
  switch (status) {
    case "Draft":
      return "outline";
    case "Submitted":
      return "secondary";
    case "Approved":
      return "default";
    case "Partially Approved":
      return "warning";
    default:
      return "outline";
  }
};

const mapItemPayload = (item: ApiOrderItem) => ({
  id: item.id,
  product_code: item.product_code || (item as any).old_code || "",  // Support both old and new field names
  product_name: item.product_name,
  pack_size: item.pack_size || null,
  quantity: item.quantity,
  free_goods: item.free_goods || 0,
  total_quantity: item.total_quantity || item.quantity + (item.free_goods || 0),
  trade_price: item.trade_price,
  unit_price: item.unit_price || item.trade_price,
  discount_percent: item.discount_percent || 0,
  delivery_date: item.delivery_date,
  batch_number: item.batch_number || null,  // Include batch_number if it exists
  selected: item.selected !== false,
});

export default function OrderListPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [filterPSO, setFilterPSO] = useState<string>("");
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  
  // Master data for filters
  const [psoList, setPsoList] = useState<Array<{id: string; name: string; code?: string}>>([]);
  const [customerList, setCustomerList] = useState<Array<{id: string; name: string; code?: string}>>([]);
  const [loadingMasterData, setLoadingMasterData] = useState(false);

  const loadOrders = useCallback(async (mode: "initial" | "update" = "update") => {
    try {
      setLoading(true);
      const data: ApiOrder[] = await apiEndpoints.orders.getAll();
      setOrders(data);
      setSelectedOrders((prev) => {
        if (mode === "initial") {
          return data
            .filter((order) => order.items.some((item) => item.selected !== false))
            .map((order) => order.id);
        }
        const filtered = prev.filter((id) =>
          data.some((order) => order.id === id && order.items.some((item) => item.selected !== false)),
        );
        return filtered;
      });
    } catch (error: any) {
      console.error("Failed to load orders", error);
      toast({
        title: "Unable to load orders",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load master data for filters
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        setLoadingMasterData(true);
        const [employees, customers] = await Promise.all([
          masterData.getEmployees(),
          masterData.getCustomers(),
        ]);
        setPsoList(employees.map((emp) => ({
          id: emp.id,
          name: emp.name || '',
          code: emp.code || '',
        })));
        setCustomerList(customers.map((cust) => ({
          id: cust.id,
          name: cust.name || '',
          code: cust.code || '',
        })));
      } catch (error) {
        console.error("Failed to load master data for filters", error);
      } finally {
        setLoadingMasterData(false);
      }
    };
    loadMasterData();
  }, []);

  useEffect(() => {
    document.title = "Order List | Order Management";
    loadOrders("initial");
  }, [loadOrders]);

  // Filter orders based on selected filters
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filter by PSO (match by ID or code)
      if (filterPSO) {
        const psoMatch = String(order.pso_id) === filterPSO || 
                        String(order.pso_code) === filterPSO ||
                        order.pso_id === filterPSO ||
                        order.pso_code === filterPSO;
        if (!psoMatch) {
          return false;
        }
      }
      
      // Filter by Customer (match by ID or code)
      if (filterCustomer) {
        const customerMatch = String(order.customer_id) === filterCustomer || 
                             String(order.customer_code) === filterCustomer ||
                             order.customer_id === filterCustomer ||
                             order.customer_code === filterCustomer;
        if (!customerMatch) {
          return false;
        }
      }
      
      // Filter by Date
      if (filterDate) {
        const orderDate = new Date(order.delivery_date);
        const filterDateObj = new Date(filterDate);
        const orderDateStr = orderDate.toISOString().split('T')[0];
        const filterDateStr = filterDateObj.toISOString().split('T')[0];
        if (orderDateStr !== filterDateStr) {
          return false;
        }
      }
      
      return true;
    });
  }, [orders, filterPSO, filterCustomer, filterDate]);

  const totalItems = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + order.items.length, 0),
    [filteredOrders],
  );

  const clearFilters = () => {
    setFilterPSO("");
    setFilterCustomer("");
    setFilterDate("");
  };

  const hasActiveFilters = filterPSO || filterCustomer || filterDate;

  const toggleExpand = (orderId: number) => {
    setExpanded((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleApprove = async (order: ApiOrder) => {
    if (!order.route_code) {
      toast({
        title: "Route required",
        description: "Order must have a route assigned before approval.",
        variant: "destructive",
      });
      return;
    }

    // Check if at least one item is selected
    const selectedItems = order.items.filter((item) => item.selected !== false);
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to approve.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // First, ensure selected items are marked as selected in the database
      const itemsToUpdate = order.items.map((item) => ({
        ...mapItemPayload(item),
        selected: item.selected !== false,
      }));
      
      // Update order with item selections
      await apiEndpoints.orders.update(order.id, {
        items: itemsToUpdate,
      });
      
      // Then approve the order (backend will approve based on selected items)
      await apiEndpoints.orders.approve({
        order_ids: [order.id],
      });
      
      // Reload orders to get updated status
      await loadOrders();
      
      const allSelected = selectedItems.length === order.items.length;
      toast({
        title: "Items approved",
        description: `${selectedItems.length} of ${order.items.length} item(s) approved. ${allSelected ? "Order is fully approved." : "Order is partially approved."}`,
      });
      
      // Navigate to route-wise order list only if all items are approved
      if (allSelected) {
        setTimeout(() => {
          navigate("/orders/route-wise");
        }, 1000);
      }
    } catch (error: any) {
      console.error("Failed to approve order", error);
      toast({
        title: "Unable to approve order",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (orderId: number) => {
    navigate(`/orders/new?orderId=${orderId}`);
  };

  const updateSelection = async (order: ApiOrder, items: ApiOrderItem[]) => {
    try {
      await apiEndpoints.orders.update(order.id, {
        items: items.map(mapItemPayload),
      });
      loadOrders();
    } catch (error: any) {
      console.error("Failed to update selection", error);
      toast({
        title: "Unable to update selection",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleToggleHeaderSelection = (order: ApiOrder, checked: boolean) => {
    const updatedItems = order.items.map((item) => ({ ...item, selected: checked }));
    updateSelection(order, updatedItems);
    setSelectedOrders((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, order.id]));
      }
      return prev.filter((id) => id !== order.id);
    });
  };

  const handleToggleItem = (order: ApiOrder, itemId: number, checked: boolean) => {
    const updatedItems = order.items.map((item) =>
      item.id === itemId ? { ...item, selected: checked } : item,
    );
    updateSelection(order, updatedItems);
  };


  return (
    <main className="p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Order List</h1>
        <p className="text-muted-foreground">
          Review orders and manage delivery assignments.
        </p>
      </header>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {filteredOrders.length} order{filteredOrders.length === 1 ? "" : "s"} • {totalItems} line item{totalItems === 1 ? "" : "s"}
                {hasActiveFilters && ` (filtered from ${orders.length} total)`}
              </p>
              <p className="text-xs text-muted-foreground">
                Use the checkboxes to control which line items flow into the approved order number.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/orders/new")}>
                Create new order
              </Button>
            </div>
          </div>

          <Separator />

          {/* Filters Section */}
          <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="filter-pso" className="text-xs text-muted-foreground">PSO</Label>
              <Select value={filterPSO || "all"} onValueChange={(value) => setFilterPSO(value === "all" ? "" : value)} disabled={loadingMasterData}>
                <SelectTrigger id="filter-pso" className="h-9">
                  <SelectValue placeholder="All PSOs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All PSOs</SelectItem>
                  {psoList.map((pso) => (
                    <SelectItem key={pso.id} value={pso.id}>
                      {pso.name} {pso.code ? `(${pso.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="filter-customer" className="text-xs text-muted-foreground">Customer</Label>
              <Select value={filterCustomer || "all"} onValueChange={(value) => setFilterCustomer(value === "all" ? "" : value)} disabled={loadingMasterData}>
                <SelectTrigger id="filter-customer" className="h-9">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customerList.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.code ? `(${customer.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <Label htmlFor="filter-date" className="text-xs text-muted-foreground">Delivery Date</Label>
              <Input
                id="filter-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-9"
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <Separator />

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 animate-pulse" />
              <p className="text-sm">Loading orders…</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10" />
              <p className="text-sm">
                {hasActiveFilters 
                  ? "No orders match the selected filters." 
                  : "No orders found. Create a new order to get started."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const isExpanded = expanded[order.id];
                const allItemsSelected = order.items.every((item) => item.selected !== false);
                const someItemsSelected = order.items.some((item) => item.selected !== false);
                const headerCheckboxState = allItemsSelected ? true : someItemsSelected ? "indeterminate" : false;
                // Check if all items are approved (all selected and order is fully approved)
                // Button should be disabled only when ALL items are selected AND order is fully approved
                const allItemsApproved = allItemsSelected && order.status === "Approved";

                return (
                  <div key={order.id} className="rounded-xl border bg-card shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleExpand(order.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:text-foreground"
                          aria-label={isExpanded ? "Collapse order" : "Expand order"}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {order.order_number || `Order #${order.id}`}
                            </span>
                            <Badge variant={statusBadgeVariant(order.status)}>{order.status}</Badge>
                            {order.route_name || order.route_code ? (
                              <Badge variant="outline" className="font-mono text-[11px]">
                                {order.route_name || order.route_code}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
                            <span>Delivery: {formatDate(order.delivery_date)}</span>
                            <span>PSO: {order.pso_name || order.pso_code}</span>
                            <span>Customer: {order.customer_name || order.customer_code}</span>
                            <span>Total items: {order.items.length}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(order.id)}
                                disabled={loading}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApprove(order)}
                                disabled={loading || allItemsApproved}
                              >
                                <Truck className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {allItemsApproved 
                                ? "All items approved" 
                                : allItemsSelected
                                ? "Approve all items"
                                : someItemsSelected
                                ? "Approve selected items"
                                : "Select items to approve"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Checkbox
                          checked={headerCheckboxState}
                          onCheckedChange={(checked) => handleToggleHeaderSelection(order, Boolean(checked))}
                          className="ml-2"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {isExpanded && (
                      <ScrollArea className="px-4 pb-4">
                        <div className="overflow-hidden rounded-lg border">
                          <div className="grid grid-cols-9 bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <span>Product code</span>
                            <span>Size</span>
                            <span className="text-right">Free goods</span>
                            <span className="text-right">Total Qty</span>
                            <span className="text-right">Unit Price</span>
                            <span className="text-right">Price - Dis.%</span>
                            <span className="text-right">Total Price</span>
                            <span className="text-right">Include</span>
                          </div>
                          <div className="divide-y">
                            {order.items.map((item) => {
                              const checked = item.selected !== false;
                              const freeGoods = Number(item.free_goods) || 0;
                              const quantity = Number(item.quantity) || 0;
                              const totalQty = Number(item.total_quantity) || (quantity + freeGoods);
                              // Safely convert prices to numbers
                              const parsePrice = (value: any): number => {
                                if (value === null || value === undefined || value === '') return 0;
                                if (typeof value === 'number') {
                                  return (!isNaN(value) && isFinite(value) && value >= 0) ? value : 0;
                                }
                                const num = Number(value);
                                return (!isNaN(num) && isFinite(num) && num >= 0) ? num : 0;
                              };
                              
                              // Get unit price, fallback to trade price
                              let unitPrice = parsePrice(item.unit_price);
                              if (unitPrice === 0) {
                                unitPrice = parsePrice(item.trade_price);
                              }
                              // Ensure it's always a number
                              unitPrice = typeof unitPrice === 'number' ? unitPrice : 0;
                              
                              const discountPercent = parsePrice(item.discount_percent);
                              const priceAfterDiscount = Number(unitPrice) * (1 - Number(discountPercent) / 100);
                              const totalPrice = Number(priceAfterDiscount) * Number(totalQty);
                              
                              // Helper function to safely format numbers
                              const formatPrice = (value: any): string => {
                                const num = typeof value === 'number' ? value : Number(value);
                                if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
                                  return '0.00';
                                }
                                return num.toFixed(2);
                              };
                              
                              return (
                                <div key={item.id} className="grid grid-cols-9 items-center gap-2 px-4 py-3 text-sm">
                                  <span className="font-mono text-xs text-muted-foreground">{item.product_code || (item as any).old_code || "—"}</span>
                                  <span>{item.pack_size || "—"}</span>
                                  <span className="text-right">{freeGoods}</span>
                                  <span className="text-right">{totalQty}</span>
                                  <span className="text-right">৳{formatPrice(unitPrice)}</span>
                                  <span className="text-right">৳{formatPrice(priceAfterDiscount)} ({discountPercent}%)</span>
                                  <span className="text-right font-medium">৳{formatPrice(totalPrice)}</span>
                                  <span className="flex justify-end">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => handleToggleItem(order, item.id, Boolean(value))}
                                      disabled={loading}
                                    />
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </ScrollArea>
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
