import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { ChevronDown, ChevronRight, Send, Pencil, CheckCircle2, ClipboardList, Truck } from "lucide-react";

interface ApiOrderItem {
  id: number;
  old_code: string;
  new_code?: string | null;
  product_name: string;
  pack_size?: string | null;
  quantity: number;
  trade_price: number;
  delivery_date: string;
  selected?: boolean | null;
}

interface ApiOrder {
  id: number;
  order_number?: string | null;
  depot_code: string;
  depot_name: string;
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
  old_code: item.old_code,
  new_code: item.new_code || null,
  product_name: item.product_name,
  pack_size: item.pack_size || null,
  quantity: item.quantity,
  trade_price: item.trade_price,
  delivery_date: item.delivery_date,
  selected: item.selected !== false,
});

export default function OrderListPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    document.title = "Order List | Order Management";
    loadOrders("initial");
  }, [loadOrders]);

  const totalItems = useMemo(
    () => orders.reduce((sum, order) => sum + order.items.length, 0),
    [orders],
  );

  const toggleExpand = (orderId: number) => {
    setExpanded((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleSubmit = async (order: ApiOrder) => {
    if (order.status !== "Draft") {
      toast({
        title: "Cannot submit",
        description: "Only draft orders can be submitted.",
        variant: "destructive",
      });
      return;
    }
    try {
      await apiEndpoints.orders.submit(order.id);
      toast({
        title: "Order submitted",
        description: `${order.depot_name} • ${order.customer_name}`,
      });
      loadOrders();
    } catch (error: any) {
      console.error("Failed to submit order", error);
      toast({
        title: "Unable to submit order",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (ids: number[]) => {
    if (!ids.length) {
      toast({
        title: "No orders selected",
        description: "Select at least one submitted order to approve.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiEndpoints.orders.approve({ order_ids: ids });
      toast({
        title: "Order approved",
        description: `Generated order no. ${response.order_number} for ${ids.length} order(s).`,
      });
      loadOrders();
    } catch (error: any) {
      console.error("Failed to approve orders", error);
      toast({
        title: "Unable to approve",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleCreateDelivery = async (order: ApiOrder) => {
    if (!(order.status === "Approved" || order.status === "Partially Approved")) {
      toast({
        title: "Order not approved",
        description: "Approve the order before generating a delivery.",
        variant: "destructive",
      });
      return;
    }
    try {
      const delivery = await apiEndpoints.deliveryOrders.createFromOrder(order.id);
      toast({ title: "Delivery order created", description: delivery.delivery_number });
      navigate(`/orders/delivery/${delivery.id}`);
    } catch (error: any) {
      console.error("Failed to create delivery", error);
      const message = error instanceof Error ? error.message : "Please try again later.";
      toast({
        title: "Unable to create delivery",
        description: message,
        variant: "destructive",
      });
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

  const selectedForApproval = orders.filter((order) => selectedOrders.includes(order.id));
  const eligibleForApproval = selectedForApproval.filter((order) =>
    order.status === "Submitted" || order.status === "Partially Approved",
  );
  const approveButtonDisabled = eligibleForApproval.length === 0;

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Order List</h1>
        <p className="text-muted-foreground">
          Review draft and submitted orders, adjust included items, and approve them into official order numbers.
        </p>
      </header>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {orders.length} order{orders.length === 1 ? "" : "s"} • {totalItems} line item{totalItems === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-muted-foreground">
                Use the checkboxes to control which line items flow into the approved order number.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={approveButtonDisabled || loading}
                      onClick={() => handleApprove(eligibleForApproval.map((order) => order.id))}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve selected
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Approve all selected, submitted orders into a single order number
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="outline" size="sm" onClick={() => navigate("/orders/new")}>
                Create new order
              </Button>
            </div>
          </div>

          <Separator />

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 animate-pulse" />
              <p className="text-sm">Loading orders…</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10" />
              <p className="text-sm">No orders found. Create a new order to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isExpanded = expanded[order.id];
                const allItemsSelected = order.items.every((item) => item.selected !== false);
                const someItemsSelected = order.items.some((item) => item.selected !== false);
                const headerCheckboxState = allItemsSelected ? true : someItemsSelected ? "indeterminate" : false;

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
                            <span className="text-sm font-semibold text-foreground">{order.depot_name}</span>
                            <Badge variant={statusBadgeVariant(order.status)}>{order.status}</Badge>
                            {order.order_number && (
                              <Badge variant="outline" className="font-mono text-[11px]">
                                {order.order_number}
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
                                onClick={() => handleSubmit(order)}
                                disabled={order.status !== "Draft" || loading}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Submit</TooltipContent>
                          </Tooltip>

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
                                onClick={() => handleApprove([order.id])}
                                disabled={
                                  loading || !(order.status === "Submitted" || order.status === "Partially Approved")
                                }
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Approve</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCreateDelivery(order)}
                                disabled={loading || !(order.status === "Approved" || order.status === "Partially Approved")}
                              >
                                <Truck className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Create delivery</TooltipContent>
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
                          <div className="grid grid-cols-11 bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <span className="col-span-3">Product</span>
                            <span className="col-span-2">Old code</span>
                            <span className="col-span-2">New code</span>
                            <span className="text-right">Pack</span>
                            <span className="text-right">Qty</span>
                            <span className="text-right">Trade price</span>
                            <span className="text-right">Include</span>
                          </div>
                          <div className="divide-y">
                            {order.items.map((item) => {
                              const checked = item.selected !== false;
                              return (
                                <div key={item.id} className="grid grid-cols-11 items-center gap-2 px-4 py-3 text-sm">
                                  <div className="col-span-3">
                                    <p className="font-medium text-foreground">{item.product_name}</p>
                                    <p className="text-xs text-muted-foreground">Delivery: {formatDate(item.delivery_date)}</p>
                                  </div>
                                  <span className="col-span-2 font-mono text-xs text-muted-foreground">{item.old_code}</span>
                                  <span className="col-span-2 font-mono text-xs text-muted-foreground">{item.new_code || "—"}</span>
                                  <span className="text-right">{item.pack_size || "—"}</span>
                                  <span className="text-right">{item.quantity}</span>
                                  <span className="text-right">৳{(item.trade_price * item.quantity).toFixed(2)}</span>
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
