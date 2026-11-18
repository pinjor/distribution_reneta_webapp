import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  FileBarChart,
  FileText,
  Loader2,
  MapPinned,
  Package,
  Printer,
  Pause,
  Search,
  Truck,
  UserRound,
  Wrench,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  FilterSelect,
  FilterStat,
  OrderPageShell,
  OrderPanel,
  fieldClass,
  panelClass,
  tableHeadClass,
} from "@/components/orders/orderMgmtUi";

interface RouteWiseOrderItem {
  id: number;
  order_id: number;
  order_number?: string | null;
  memo_number?: string | null;  // 8-digit numeric memo/invoice number
  product_code: string;
  size?: string | null;
  free_goods: number;
  total_quantity: number;
  unit_price: number;
  discount_percent: number;
  total_price: number;
  customer_name: string;
  customer_code?: string | null;
  route_code?: string | null;
  route_name?: string | null;
  validated: boolean;
  printed: boolean;
  postponed: boolean;
  loaded: boolean;
  pso_name?: string | null;
  pso_code?: string | null;
}

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  is_active?: boolean;
}

interface Vehicle {
  id: number;
  registration_number: string;
  vehicle_type?: string | null;
  model?: string | null;
  is_active?: boolean;
}

interface RouteStats {
  total_order: number;
  validated: number;
  printed: number;
  pending_print: number;
  loaded: number;
  postponed: number;
}

interface RouteWiseData {
  route_code?: string | null;
  route_name?: string | null;
  stats: RouteStats;
  items: RouteWiseOrderItem[];
}

interface OrderSummary {
  orderId: number;
  orderNumber: string;
  memoNumber: string | null;  // 8-digit numeric memo/invoice number
  customerName: string;
  customerCode: string;
  psoName: string;
  psoCode: string;
  totalAmount: number;
  totalDiscount: number;
  totalItems: number;
  validated: boolean;
  printed: boolean;
  postponed: boolean;
  loaded: boolean;
  items: RouteWiseOrderItem[];
}

interface RouteCard {
  routeCode: string;
  routeName: string;
  totalAmount: number;
  status: string;
  validatedCount: number;
  totalOrderCount: number;
  orders: OrderSummary[];
}

export default function RouteWiseOrderList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    document.title = "Route Wise Memo List | Renata";
  }, []);

  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [printing, setPrinting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [routeFilter, setRouteFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Load employees
  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: apiEndpoints.employees.getAll,
  });

  // Load vehicles
  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: apiEndpoints.vehicles.getAll,
  });

  // Load all route-wise orders
  const { data: allRouteData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['route-wise-orders-all'],
    queryFn: async () => {
      return await apiEndpoints.orders.getAllRouteWise();
    },
  });

  // Handle API response format - could be direct array or wrapped in data property
  const employees: Employee[] = Array.isArray(employeesData) 
    ? employeesData 
    : (employeesData?.data || []);
  const allVehicles: Vehicle[] = Array.isArray(vehiclesData)
    ? vehiclesData
    : (vehiclesData?.data || []);
  
  // Filter active vehicles only
  const vehicles: Vehicle[] = allVehicles.filter((v: any) => v.is_active !== false);
  const routeWiseData: RouteWiseData[] = (allRouteData || []).map((data: any) => ({
    route_code: data.route_code || "",
    route_name: data.route_name || "",
    stats: data.stats,
    items: data.items || [],
  }));

  // Get unique routes for filter
  const uniqueRoutes = useMemo(() => {
    const routes = new Set<string>();
    routeWiseData.forEach((data) => {
      if (data.route_code) {
        routes.add(data.route_code);
      }
    });
    return Array.from(routes).sort();
  }, [routeWiseData]);

  // Group items by route and then by order
  const routeCards = useMemo(() => {
    const routeMap: Record<string, RouteCard> = {};
    
    routeWiseData.forEach((routeData) => {
      if (!routeData.route_code) return;
      
      const routeCode = routeData.route_code;
      const routeName = routeData.route_name || routeCode;
      
      if (!routeMap[routeCode]) {
        routeMap[routeCode] = {
          routeCode,
          routeName,
          totalAmount: 0,
          status: "Active",
          validatedCount: 0,
          totalOrderCount: 0,
          orders: [],
        };
      }
      
      // Group items by order_id
      const orderMap: Record<number, OrderSummary> = {};
      
      routeData.items.forEach((item) => {
        const orderId = item.order_id;
        
        if (!orderMap[orderId]) {
          orderMap[orderId] = {
            orderId,
            orderNumber: item.order_number || `order-${orderId}`,
            memoNumber: item.memo_number || null,
            customerName: item.customer_name || "—",
            customerCode: item.customer_code || "—",
            psoName: item.pso_name || "—",
            psoCode: item.pso_code || "—",
            totalAmount: 0,
            totalDiscount: 0,
            totalItems: 0,
            validated: item.validated,
            printed: item.printed,
            postponed: item.postponed || false,
            loaded: item.loaded,
            items: [],
          };
        }
        
        orderMap[orderId].items.push(item);
        const itemTotalPrice = Number(item.total_price) || 0;
        const itemUnitPrice = Number(item.unit_price) || 0;
        const itemDiscountPercent = Number(item.discount_percent) || 0;
        const itemTotalQty = Number(item.total_quantity) || 0;
        
        orderMap[orderId].totalAmount += itemTotalPrice;
        orderMap[orderId].totalDiscount += itemUnitPrice * itemDiscountPercent / 100 * itemTotalQty;
        orderMap[orderId].totalItems += itemTotalQty;
        orderMap[orderId].validated = item.validated;
        orderMap[orderId].printed = item.printed;
        orderMap[orderId].postponed = item.postponed || false;
        orderMap[orderId].loaded = item.loaded;
      });
      
      const orders = Object.values(orderMap);
      // Sort orders by orderId descending (most recent first - last in, first show)
      orders.sort((a, b) => b.orderId - a.orderId);
      
      const validatedCount = orders.filter(o => o.validated).length;
      const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      
      routeMap[routeCode].orders = orders;
      routeMap[routeCode].validatedCount = routeData.stats?.validated || validatedCount;
      routeMap[routeCode].totalOrderCount = routeData.stats?.total_order || orders.length; // Use backend stats which includes pending + validated
      routeMap[routeCode].totalAmount = totalAmount;
    });
    
    return Object.values(routeMap).sort((a, b) => a.routeCode.localeCompare(b.routeCode));
  }, [routeWiseData]);

  // Flatten route cards to order groups for filtering
  const orderGroups = useMemo(() => {
    const allOrders: OrderSummary[] = [];
    routeCards.forEach((route) => {
      allOrders.push(...route.orders.map(order => ({ ...order, routeCode: route.routeCode })));
    });
    return allOrders;
  }, [routeCards]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = orderGroups;
    
    // Filter by route
    if (routeFilter !== "all") {
      filtered = filtered.filter((order: any) => order.routeCode === routeFilter);
    }
    
    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => {
        switch (statusFilter) {
          case "pending_print":
            return !order.printed;
          case "printed":
            return order.printed;
          case "loaded":
            return order.loaded;
          case "postponed":
            return order.postponed;
          default:
            return true;
        }
      });
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(term) ||
          order.customerName.toLowerCase().includes(term) ||
          order.customerCode.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [orderGroups, routeFilter, statusFilter, searchTerm]);

  // Filter route cards based on filters
  const filteredRouteCards = useMemo(() => {
    let filtered = routeCards;
    
    // Filter by route
    if (routeFilter !== "all") {
      filtered = filtered.filter((route) => route.routeCode === routeFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((route) => {
        if (route.routeCode.toLowerCase().includes(term) || route.routeName.toLowerCase().includes(term)) {
          return true;
        }
        return route.orders.some((order) =>
          order.orderNumber.toLowerCase().includes(term) ||
          order.customerName.toLowerCase().includes(term) ||
          order.customerCode.toLowerCase().includes(term)
        );
      });
    }
    
    // Filter orders within each route by status
    if (statusFilter !== "all") {
      filtered = filtered.map((route) => ({
        ...route,
        orders: route.orders.filter((order) => {
          switch (statusFilter) {
            case "pending_print":
              return !order.printed;
            case "printed":
              return order.printed;
            case "loaded":
              return order.loaded;
            case "postponed":
              return order.postponed;
            default:
              return true;
          }
        }),
      })).filter((route) => route.orders.length > 0);
    }
    
    return filtered;
  }, [routeCards, routeFilter, statusFilter, searchTerm]);

  const toggleExpand = (routeCode: string) => {
    setExpandedRoutes((prev) => ({ ...prev, [routeCode]: !prev[routeCode] }));
  };

  const toggleOrderExpand = (orderId: number) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleSelectOrder = (orderId: number, checked: boolean) => {
    setSelectedOrders((prev) => {
      if (checked) {
        return [...prev, orderId];
      }
      return prev.filter((id) => id !== orderId);
    });
  };

  const handleSelectAll = (checked: boolean, routeOrders: OrderSummary[]) => {
    if (checked) {
      setSelectedOrders((prev) => [...new Set([...prev, ...routeOrders.map((o) => o.orderId)])]);
    } else {
      setSelectedOrders((prev) => prev.filter((id) => !routeOrders.some((o) => o.orderId === id)));
    }
  };

  const handleSelectAllFiltered = (checked: boolean) => {
    if (checked) {
      // Select all orders from filtered route cards
      const allFilteredOrderIds = filteredRouteCards.flatMap((route) => 
        route.orders.map((order) => order.orderId)
      );
      setSelectedOrders([...new Set(allFilteredOrderIds)]);
    } else {
      // Unselect all filtered orders
      const filteredOrderIds = filteredRouteCards.flatMap((route) => 
        route.orders.map((order) => order.orderId)
      );
      setSelectedOrders((prev) => prev.filter((id) => !filteredOrderIds.includes(id)));
    }
  };

  const handleTileClick = (filterType: string) => {
    if (filterType === "assigned") {
      navigate("/orders/assigned");
    } else if (filterType === "validated") {
      // Show all orders (clear status filter since all orders here are validated)
      setStatusFilter("all");
      setSelectedOrders([]); // Clear selection when changing filter
    } else {
      // Set the status filter (including postponed)
      setStatusFilter(filterType);
      setSelectedOrders([]); // Clear selection when changing filter
    }
  };

  const handlePrint = async () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "No orders selected",
        description: "Please select at least one order to print.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPrinting(true);
      // Filter to only pending print orders (not already printed and not postponed)
      const pendingPrintOrders = filteredOrders.filter((order: any) => 
        selectedOrders.includes(order.orderId) && !order.printed && !order.postponed
      );

      // Check for postponed orders
      const postponedOrders = filteredOrders.filter((order: any) => 
        selectedOrders.includes(order.orderId) && order.postponed
      );

      if (postponedOrders.length > 0) {
        toast({
          title: "Cannot print postponed orders",
          description: `${postponedOrders.length} selected order(s) are postponed and cannot be printed.`,
          variant: "destructive",
        });
        setPrinting(false);
        return;
      }

      if (pendingPrintOrders.length === 0) {
        toast({
          title: "No pending orders to print",
          description: "All selected orders are already printed.",
          variant: "destructive",
        });
        setPrinting(false);
        return;
      }

      // Group pending print orders by route
      const ordersByRoute: Record<string, number[]> = {};
      pendingPrintOrders.forEach((order: any) => {
        const route = order.routeCode;
        if (!ordersByRoute[route]) {
          ordersByRoute[route] = [];
        }
        ordersByRoute[route].push(order.orderId);
      });

      // Print for each route (generate and download PDF) - only pending print orders
      for (const [routeCode, orderIds] of Object.entries(ordersByRoute)) {
        try {
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost/api';
          
          const response = await fetch(`${apiUrl}/orders/route-wise/print`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              order_ids: orderIds,
              route_code: routeCode,
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Print response error:', errorText);
            throw new Error(`Failed to generate packing report: ${response.status} ${response.statusText}`);
          }
          
          // Check if response is actually a PDF
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/pdf')) {
            const text = await response.text();
            console.error('Unexpected response type:', contentType, text);
            throw new Error('Server did not return a PDF file');
          }
          
          // Get PDF blob
          const blob = await response.blob();
          
          if (blob.size === 0) {
            throw new Error('Generated PDF is empty');
          }
          
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Packing_Report_${routeCode}_${new Date().toISOString().split('T')[0]}.pdf`;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          
          // Clean up after a short delay
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }, 100);
        } catch (error: any) {
          console.error(`Error generating PDF for route ${routeCode}:`, error);
          toast({
            title: "Print error",
            description: `Failed to generate report for route ${routeCode}: ${error.message}`,
            variant: "destructive",
          });
          // Continue with other routes even if one fails
        }
      }
      
      const totalPrinted = Object.values(ordersByRoute).flat().length;
      toast({
        title: "Report generated",
        description: `Packing report downloaded for ${totalPrinted} pending order(s). ${selectedOrders.length - totalPrinted > 0 ? `${selectedOrders.length - totalPrinted} order(s) were already printed and skipped.` : ''}`,
      });
      
      // Reload orders to update printed status and stats
      refetchOrders();
      setSelectedOrders([]);
    } catch (error: any) {
      console.error("Failed to print", error);
      toast({
        title: "Print failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setPrinting(false);
    }
  };

  const handleAssign = async () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "No orders selected",
        description: "Please select at least one order to assign.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedEmployee) {
      toast({
        title: "Employee required",
        description: "Please select an employee to assign.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedVehicle) {
      toast({
        title: "Vehicle required",
        description: "Please select a vehicle to assign.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAssigning(true);
      // Get all selected orders (can be from multiple routes)
      const ordersToAssign = filteredOrders.filter((order: any) => 
        selectedOrders.includes(order.orderId)
      );
      const allOrderIds = ordersToAssign.map((order: any) => order.orderId);
      
      // Get unique route codes from selected orders
      const routeCodes = [...new Set(ordersToAssign.map((order: any) => order.routeCode))];
      const firstRouteCode = routeCodes[0] || "";
      
      // Assign all orders at once (even from multiple routes)
      await apiEndpoints.orders.assignRouteWise({
        order_ids: allOrderIds,
        employee_id: Number(selectedEmployee),
        vehicle_id: Number(selectedVehicle),
        route_code: firstRouteCode, // Pass first route for compatibility
        route_codes: routeCodes, // Pass all route codes for display
      });
      
      toast({
        title: "Assignment successful",
        description: `Assigned ${selectedOrders.length} order(s) to employee and vehicle.`,
      });
      
      // Invalidate cache to sync with Assigned Order List and refresh stats
      queryClient.invalidateQueries({ queryKey: ['route-wise-orders'] });
      queryClient.invalidateQueries({ queryKey: ['route-wise-orders-all'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-orders'] });
      
      // Refetch to update the stats immediately
      await refetchOrders();
      setSelectedOrders([]);
      setSelectedEmployee("");
      setSelectedVehicle("");
    } catch (error: any) {
      console.error("Failed to assign", error);
      toast({
        title: "Assignment failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  // Calculate overall stats from backend route stats (which include pending + validated)
  const overallStats = useMemo(() => {
    // Sum up stats from all routes (backend already calculates total_order as pending + validated)
    const total_order = routeWiseData.reduce((sum, route) => sum + (route.stats?.total_order || 0), 0);
    const validated = routeWiseData.reduce((sum, route) => sum + (route.stats?.validated || 0), 0);
    const printed = routeWiseData.reduce((sum, route) => sum + (route.stats?.printed || 0), 0);
    const pending_print = routeWiseData.reduce((sum, route) => sum + (route.stats?.pending_print || 0), 0);
    const loaded = routeWiseData.reduce((sum, route) => sum + (route.stats?.loaded || 0), 0);
    const postponed = routeWiseData.reduce((sum, route) => sum + (route.stats?.postponed || 0), 0);
    
    return {
      total_order,
      validated,
      printed,
      pending_print,
      loaded,
      postponed,
    };
  }, [routeWiseData]);

  const formatPrice = (value: any): string => {
    const num = typeof value === 'number' ? value : Number(value);
    if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
      return '0.00';
    }
    return num.toFixed(2);
  };

  const navigate = useNavigate();

  return (
    <OrderPageShell>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <FilterStat title="Total Order" value={overallStats.total_order} icon={Package} />
        <FilterStat
          title="Validated"
          value={overallStats.validated}
          icon={CheckCircle2}
          accent="green"
          onClick={() => handleTileClick("validated")}
          active={statusFilter === "all"}
        />
        <FilterStat
          title="Pending Print"
          value={overallStats.pending_print}
          icon={FileText}
          onClick={() => handleTileClick("pending_print")}
          active={statusFilter === "pending_print"}
        />
        <FilterStat
          title="Printed"
          value={overallStats.printed}
          icon={Printer}
          onClick={() => handleTileClick("printed")}
          active={statusFilter === "printed"}
        />
        <FilterStat
          title="Assigned"
          value={overallStats.loaded}
          icon={Truck}
          onClick={() => handleTileClick("assigned")}
        />
        <FilterStat
          title="Postponed"
          value={overallStats.postponed}
          icon={Clock}
          accent="purple"
          onClick={() => handleTileClick("postponed")}
          active={statusFilter === "postponed"}
        />
      </div>

      <OrderPanel className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-1 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Memo & Packing list</h2>
          <FilterSelect
            id="employee"
            label="Assign DA (Employee)"
            value={selectedEmployee}
            onValueChange={setSelectedEmployee}
            placeholder="Assign DA"
            icon={UserRound}
            disabled={employeesLoading || assigning}
            triggerClassName="w-[11.5rem] min-w-0"
            emptyMessage={employeesLoading ? "Loading employees..." : "No employees available"}
            items={employees
              .filter((emp) => emp.is_active !== false)
              .map((employee) => {
                const fullName = `${employee.first_name}${employee.last_name ? ` ${employee.last_name}` : ""}`.trim();
                return {
                  value: String(employee.id),
                  label: `${fullName} (${employee.employee_id})`,
                  icon: UserRound,
                };
              })}
          />
          <FilterSelect
            id="vehicle"
            label="Assign Vehicle"
            value={selectedVehicle}
            onValueChange={setSelectedVehicle}
            placeholder="Assign vehicle"
            icon={Truck}
            disabled={vehiclesLoading || assigning}
            triggerClassName="w-[11.5rem] min-w-0"
            emptyMessage={vehiclesLoading ? "Loading vehicles..." : "No vehicles available"}
            items={vehicles.map((vehicle) => ({
              value: String(vehicle.id),
              label: `${vehicle.registration_number}${(vehicle.vehicle_type || vehicle.model) ? ` (${vehicle.vehicle_type || vehicle.model})` : ""}`,
              icon: Truck,
            }))}
          />
          <div className="ml-auto flex flex-wrap gap-2">
            <Button type="button" variant="ntSecondary" className="!h-8" onClick={() => navigate("/warehouse/maintenance")}>
              <Wrench className="h-3.5 w-3.5" />
              Stock Management
            </Button>
            <Button type="button" variant="ntSecondary" className="!h-8" onClick={() => navigate("/billing/deposits")}>
              <Coins className="h-3.5 w-3.5" />
              Collection Deposits
            </Button>
            <Button type="button" variant="ntSecondary" className="!h-8" onClick={handlePrint} disabled={selectedOrders.length === 0 || printing || ordersLoading}>
              {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              Print
            </Button>
            <Button type="button" variant="ntPrimary" className="!h-8" onClick={handleAssign} disabled={selectedOrders.length === 0 || !selectedEmployee || !selectedVehicle || assigning || ordersLoading}>
              {assigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
              Assign
            </Button>
          </div>
        </div>
      </OrderPanel>

      <OrderPanel className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {filteredRouteCards.length > 0 && (
              <>
                <Checkbox
                  checked={(() => {
                    const allFilteredOrderIds = filteredRouteCards.flatMap((route) =>
                      route.orders.map((order) => order.orderId)
                    );
                    return allFilteredOrderIds.length > 0 && allFilteredOrderIds.every((id) => selectedOrders.includes(id));
                  })()}
                  onCheckedChange={handleSelectAllFiltered}
                  disabled={ordersLoading || filteredRouteCards.flatMap((route) => route.orders).length === 0}
                />
                <Label className="mr-1 whitespace-nowrap text-sm font-medium">
                  Select All
                  {selectedOrders.length > 0 && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({selectedOrders.length})
                    </span>
                  )}
                </Label>
              </>
            )}
            <div className="relative w-64 shrink-0">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
              <Input
                id="search"
                aria-label="Search"
                placeholder="Search order, customer, route..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(fieldClass, "h-8 pl-8")}
              />
            </div>
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
                ...uniqueRoutes.map((route) => ({ value: route, label: route, icon: MapPinned })),
              ]}
            />
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
                { value: "pending_print", label: "Pending Print", icon: Clock },
                { value: "printed", label: "Printed", icon: Printer },
                { value: "loaded", label: "Assigned", icon: Truck },
                { value: "postponed", label: "Postponed", icon: Pause },
              ]}
            />
          </div>
      </OrderPanel>

      <div className="space-y-2">
        {ordersLoading ? (
          <OrderPanel className="flex flex-col items-center gap-2 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0C4DA1]" />
            <p className="text-sm text-[#64748B]">Loading orders…</p>
          </OrderPanel>
        ) : filteredRouteCards.length === 0 ? (
          <OrderPanel className="flex flex-col items-center gap-2 py-10 text-center">
            <Package className="h-8 w-8 text-[#94A3B8]" />
            <p className="text-sm text-[#64748B]">No routes found.</p>
          </OrderPanel>
        ) : (
          filteredRouteCards.map((route) => {
            const isRouteExpanded = expandedRoutes[route.routeCode];
            const routeOrders = route.orders;
            const allRouteOrdersSelected = routeOrders.length > 0 && routeOrders.every((o) => selectedOrders.includes(o.orderId));

            return (
              <div key={route.routeCode} className={cn(panelClass, "overflow-hidden")}>
                <button
                  type="button"
                  onClick={() => toggleExpand(route.routeCode)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#F8FAFC] dark:hover:bg-[#1B283B]"
                  aria-expanded={isRouteExpanded}
                  aria-label={isRouteExpanded ? "Collapse route" : "Expand route"}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#E3EAF3] text-[#64748B] dark:border-[#2C3B50]">
                    {isRouteExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FC] text-[#0C4DA1]">
                    <MapPinned className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{route.routeName}</span>
                      <span className="rounded-md bg-[#EAF2FC] px-1.5 py-0.5 text-[11px] font-semibold text-[#0C4DA1]">
                        {route.routeCode}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                          route.status === "Active"
                            ? "bg-[#ECFDF5] text-[#047857]"
                            : "bg-[#F1F5F9] text-[#64748B] dark:bg-[#1B283B] dark:text-[#A9B8CC]",
                        )}
                      >
                        {route.status}
                      </span>
                    </span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-4 text-[12px] text-[#64748B] sm:flex">
                    <span>
                      ৳<span className="font-semibold tabular-nums text-[#172B4D] dark:text-[#F1F5F9]">{formatPrice(route.totalAmount)}</span>
                    </span>
                    <span>
                      Orders <span className="font-semibold tabular-nums text-[#172B4D] dark:text-[#F1F5F9]">{route.totalOrderCount}</span>
                    </span>
                    <span>
                      Validated <span className="font-semibold tabular-nums text-[#172B4D] dark:text-[#F1F5F9]">{route.validatedCount}</span>
                    </span>
                  </span>
                </button>
                <div className="flex justify-end gap-4 px-3 pb-2 text-[12px] text-[#64748B] sm:hidden">
                  <span>৳{formatPrice(route.totalAmount)}</span>
                  <span>Orders {route.totalOrderCount}</span>
                  <span>Validated {route.validatedCount}</span>
                </div>

                {isRouteExpanded && (
                  <div className="space-y-2 border-t border-[#E3EAF3] px-3 py-2.5 dark:border-[#2C3B50]">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allRouteOrdersSelected}
                        onCheckedChange={(checked) => handleSelectAll(Boolean(checked), routeOrders)}
                        disabled={ordersLoading}
                      />
                      <Label className="text-sm font-medium">Select All Orders</Label>
                    </div>

                    {routeOrders.map((order) => {
                      const isOrderExpanded = expandedOrders[order.orderId];
                      const isSelected = selectedOrders.includes(order.orderId);
                      return (
                        <div
                          key={order.orderId}
                          className={cn(
                            "rounded-lg border px-3 py-2",
                            isSelected
                              ? "border-[#0C4DA1] bg-[#EAF2FC]/70 dark:bg-[#1B304D]/40"
                              : "border-[#E3EAF3] dark:border-[#2C3B50]",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectOrder(order.orderId, Boolean(checked))}
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                                {order.memoNumber || `order-${order.orderId}`}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[#64748B]">
                                <span>
                                  {order.customerName}{" "}
                                  <span className="text-[#94A3B8]">({order.customerCode})</span>
                                </span>
                                <span className="font-semibold text-[#172B4D] dark:text-[#F1F5F9]">৳{formatPrice(order.totalAmount)}</span>
                                <span>Disc. ৳{formatPrice(order.totalDiscount)}</span>
                                <span>{order.totalItems} items</span>
                                <span>
                                  {order.psoName} <span className="text-[#94A3B8]">({order.psoCode})</span>
                                </span>
                                <span>{order.orderNumber || `order-${order.orderId}`}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {order.postponed && (
                                <span className="rounded-md bg-[#FEE2E2] px-1.5 py-0.5 text-[11px] font-semibold text-[#B91C1C]">Postponed</span>
                              )}
                              {order.printed && (
                                <span className="rounded-md bg-[#CCFBF1] px-1.5 py-0.5 text-[11px] font-semibold text-[#0F766E]">Printed</span>
                              )}
                              {order.loaded && (
                                <span className="rounded-md bg-[#EDE9FE] px-1.5 py-0.5 text-[11px] font-semibold text-[#6D28D9]">Assigned</span>
                              )}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => navigate(`/orders/mis-report?memo_id=${order.orderId}`)}
                                      className="h-7 w-7"
                                    >
                                      <FileBarChart className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View in MIS Report</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <button
                                type="button"
                                onClick={() => toggleOrderExpand(order.orderId)}
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E3EAF3] text-[#64748B] hover:text-[#172B4D] dark:border-[#2C3B50]"
                                aria-label={isOrderExpanded ? "Collapse order" : "Expand order"}
                              >
                                {isOrderExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          {isOrderExpanded && (
                            <div className="mt-2 overflow-hidden rounded-lg border border-[#E3EAF3] dark:border-[#2C3B50]">
                              <Table>
                                <TableHeader className={tableHeadClass}>
                                  <TableRow>
                                    <TableHead className="w-[120px]">Product Code</TableHead>
                                    <TableHead className="w-[80px]">Size</TableHead>
                                    <TableHead className="w-[100px] text-right">Free Goods</TableHead>
                                    <TableHead className="w-[100px] text-right">Total Qty</TableHead>
                                    <TableHead className="w-[110px] text-right">Unit Price</TableHead>
                                    <TableHead className="w-[130px] text-right">Price - Dis.%</TableHead>
                                    <TableHead className="w-[120px] text-right">Total Price</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {order.items.map((item) => {
                                    const parsePrice = (value: any): number => {
                                      if (value === null || value === undefined || value === "") return 0;
                                      if (typeof value === "number") {
                                        return !isNaN(value) && isFinite(value) && value >= 0 ? value : 0;
                                      }
                                      const num = Number(value);
                                      return !isNaN(num) && isFinite(num) && num >= 0 ? num : 0;
                                    };

                                    const unitPrice = parsePrice(item.unit_price);
                                    const discountPercent = parsePrice(item.discount_percent);
                                    const totalPrice = parsePrice(item.total_price);
                                    const priceAfterDiscount = Number(unitPrice) * (1 - Number(discountPercent) / 100);

                                    return (
                                      <TableRow key={item.id} className="text-sm">
                                        <TableCell className="font-mono text-xs">{item.product_code}</TableCell>
                                        <TableCell>{item.size || "—"}</TableCell>
                                        <TableCell className="text-right">{Number(item.free_goods || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{Number(item.total_quantity || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">৳{formatPrice(unitPrice)}</TableCell>
                                        <TableCell className="text-right">
                                          ৳{formatPrice(priceAfterDiscount)} ({discountPercent}%)
                                        </TableCell>
                                        <TableCell className="text-right font-medium">৳{formatPrice(totalPrice)}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
