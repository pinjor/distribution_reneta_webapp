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
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronRight, Pencil, ClipboardList, Truck, Filter, X, PlusCircle, Package, MapPinned, TruckIcon, Loader2, Trash2, FileBarChart } from "lucide-react";
import { OrderBreadcrumb } from "@/components/layout/OrderBreadcrumb";

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
  const queryClient = useQueryClient();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [validatingOrders, setValidatingOrders] = useState<Set<number>>(new Set());
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
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
    document.title = "Delivery Order | Renata";
    loadOrders("initial");
  }, [loadOrders]);

  // Filter orders based on selected filters
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // IMPORTANT: Only show orders with a route assigned (no orders without route in delivery list)
      if (!order.route_code || order.route_code.trim() === '') {
        return false;
      }
      
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

  const handleOrderSelection = (orderId: number, checked: boolean) => {
    setSelectedOrders((prev) => {
      if (checked) {
        return [...prev, orderId];
      }
      return prev.filter((id) => id !== orderId);
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all orders in the filtered list
      const allOrderIds = filteredOrders.map((order) => order.id);
      setSelectedOrders(allOrderIds);
    } else {
      // Unselect all orders
      setSelectedOrders([]);
    }
  };

  const handleValidateAll = async () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "No orders selected",
        description: "Please select at least one order to validate.",
        variant: "destructive",
      });
      return;
    }

    // Filter to only orders that can be validated (have route and all items selected)
    const ordersToValidate = filteredOrders.filter((order) => {
      if (!selectedOrders.includes(order.id)) return false;
      if (!order.route_code) return false;
      const allItemsSelected = order.items.every((item) => item.selected !== false);
      return allItemsSelected && order.items.length > 0;
    });
    
    // Get list of orders that were selected but cannot be validated
    const invalidOrders = filteredOrders.filter((order) => {
      if (!selectedOrders.includes(order.id)) return false;
      if (!order.route_code) return true;
      const allItemsSelected = order.items.every((item) => item.selected !== false);
      return !allItemsSelected || order.items.length === 0;
    });

    // Check if there are any valid orders to validate
    if (ordersToValidate.length === 0) {
      toast({
        title: "No valid orders to validate",
        description: selectedOrders.length > 0 
          ? "Selected orders are missing routes or have unselected items. Please ensure all orders have routes assigned and all items selected."
          : "Please select orders with routes assigned and all items selected.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const validOrderIds = ordersToValidate.map(order => order.id);
      setValidatingOrders(new Set(validOrderIds));
      
      // Update all valid orders to ensure items are marked as selected
      for (const order of ordersToValidate) {
        const itemsToUpdate = order.items.map((item) => ({
          ...mapItemPayload(item),
          selected: item.selected !== false,
        }));
        await apiEndpoints.orders.update(order.id, {
          items: itemsToUpdate,
        });
      }
      
      // Validate only the valid orders
      await apiEndpoints.orders.validate({
        order_ids: validOrderIds,
      });
      
      // Reload orders to get updated status
      await loadOrders();
      
      // Invalidate cache to sync with Route Wise List
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['route-wise-orders'] });
      
      // Show success message
      toast({
        title: "Orders validated",
        description: `Successfully validated ${validOrderIds.length} order(s).`,
      });
      
      // Clear selection
      setSelectedOrders([]);
      
      // Optionally navigate to route-wise list
      setTimeout(() => {
        navigate("/orders/route-wise");
      }, 1000);
    } catch (error: any) {
      console.error("Failed to validate orders", error);
      toast({
        title: "Unable to validate orders",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setValidatingOrders(new Set());
    }
  };

  const handleValidate = async (order: ApiOrder) => {
    if (!order.route_code) {
      toast({
        title: "Route required",
        description: "Order must have a route assigned before validation.",
        variant: "destructive",
      });
      return;
    }

    // Check if at least one item is selected
    const selectedItems = order.items.filter((item) => item.selected !== false);
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to validate.",
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
      
      // Then validate the order (backend will validate based on selected items)
      await apiEndpoints.orders.validate({
        order_ids: [order.id],
      });
      
      // Reload orders to get updated status
      await loadOrders();
      
      // Invalidate cache to sync with Route Wise List
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['route-wise-orders'] });
      
      const allSelected = selectedItems.length === order.items.length;
      toast({
        title: "Order validated",
        description: `${selectedItems.length} of ${order.items.length} item(s) validated. ${allSelected ? "Order is fully validated." : "Order is partially validated."}`,
      });
      
      // Navigate to route-wise order list only if all items are validated
      if (allSelected) {
        setTimeout(() => {
          navigate("/orders/route-wise");
        }, 1000);
      }
    } catch (error: any) {
      console.error("Failed to validate order", error);
      toast({
        title: "Unable to validate order",
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

  const handleDelete = async (orderId: number) => {
    try {
      setLoading(true);
      await apiEndpoints.orders.delete(orderId);
      
      // Remove from selected orders if it was selected
      setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
      
      // Reload orders to reflect deletion
      await loadOrders();
      
      toast({
        title: "Order deleted",
        description: "The order has been successfully deleted.",
      });
    } catch (error: any) {
      console.error("Failed to delete order", error);
      toast({
        title: "Unable to delete order",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeletingOrderId(null);
    }
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
      <OrderBreadcrumb />
      {/* Navigation Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/orders/new")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Order Creation</p>
              <p className="text-xl font-bold">New Order</p>
            </div>
            <PlusCircle className="h-7 w-7 text-primary" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/orders/route-wise")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Route Wise Memo List</p>
              <p className="text-xl font-bold">Route View</p>
            </div>
            <MapPinned className="h-7 w-7 text-primary" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/warehouse/maintenance")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Stock Management</p>
              <p className="text-xl font-bold">Manage Stock</p>
            </div>
            <Package className="h-7 w-7 text-primary" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/orders/assigned")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Assigned Order List</p>
              <p className="text-xl font-bold">View Assignments</p>
            </div>
            <TruckIcon className="h-7 w-7 text-primary" />
          </CardContent>
        </Card>
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Delivery Order</h1>
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
                Use the checkboxes to control which line items flow into the validated order number.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedOrders.length > 0 && (
                  <Button 
                  onClick={handleValidateAll} 
                  disabled={loading || validatingOrders.size > 0}
                  size="sm"
                >
                  {loading && validatingOrders.size > 0 ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Truck className="h-4 w-4 mr-2" />
                  )}
                  Validate All ({selectedOrders.length})
                </Button>
              )}
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
              {/* Select All Checkbox */}
              <div className="flex items-center gap-2 p-2 border-b">
                <Checkbox
                  checked={filteredOrders.length > 0 && filteredOrders.every((order) => 
                    selectedOrders.includes(order.id)
                  )}
                  onCheckedChange={handleSelectAll}
                  disabled={loading}
                />
                <Label className="text-sm font-medium">Select All Orders</Label>
                {selectedOrders.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedOrders.length} selected)
                  </span>
                )}
              </div>
              {filteredOrders.map((order) => {
                const isExpanded = expanded[order.id];
                const allItemsSelected = order.items.every((item) => item.selected !== false);
                const someItemsSelected = order.items.some((item) => item.selected !== false);
                const headerCheckboxState = allItemsSelected ? true : someItemsSelected ? "indeterminate" : false;
                // Note: Validated orders won't appear in this list (filtered in backend)
                // So we only need to check if all items are selected
                const allItemsValidated = false; // Will be true after validation, but order will disappear from list

                return (
                  <div key={order.id} className={`rounded-xl border bg-card shadow-sm ${selectedOrders.includes(order.id) ? 'border-primary bg-primary/5' : ''}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={(checked) => handleOrderSelection(order.id, Boolean(checked))}
                          disabled={loading}
                          className="mr-1"
                        />
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
                              {order.order_number || `order-${order.id}`}
                            </span>
                            {order.route_name || order.route_code ? (
                              <Badge variant="outline" className="font-mono text-[11px]">
                                {order.route_name || order.route_code}
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[11px]">
                                No Route
                              </Badge>
                            )}
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
                                onClick={() => handleValidate(order)}
                                disabled={loading || allItemsValidated}
                              >
                                <Truck className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {allItemsValidated 
                                ? "Order validated" 
                                : allItemsSelected
                                ? "Validate order"
                                : someItemsSelected
                                ? "Select all items to validate"
                                : "Select items to validate"}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/orders/mis-report?memo_id=${order.id}`)}
                                disabled={loading}
                              >
                                <FileBarChart className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View in MIS Report</TooltipContent>
                          </Tooltip>

                          <AlertDialog open={deletingOrderId === order.id} onOpenChange={(open) => !open && setDeletingOrderId(null)}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingOrderId(order.id);
                                    }}
                                    disabled={loading}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Order</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete order <strong>{order.order_number || `order-${order.id}`}</strong>?
                                  This action cannot be undone. All items in this order will be permanently deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeletingOrderId(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(order.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  disabled={loading}
                                >
                                  {loading ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    "Delete"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
