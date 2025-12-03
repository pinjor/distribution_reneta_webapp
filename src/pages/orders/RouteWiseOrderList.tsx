import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { 
  ChevronDown, 
  ChevronRight, 
  Printer, 
  Truck, 
  Package, 
  CheckCircle2,
  Loader2,
  FileText,
  Search,
  ArrowLeft,
  ClipboardList,
  PlusCircle,
  Wrench,
  TruckIcon,
  DollarSign,
  Clock,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
            orderNumber: item.order_number || `Order #${orderId}`,
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
      
      refetchOrders();
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
            <h1 className="text-2xl font-semibold text-foreground">Route Wise Memo List</h1>
            <p className="text-muted-foreground">
              Manage orders by route, print invoices, and assign to employees and vehicles.
            </p>
          </div>
        </div>
      </header>

      {/* Navigation Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/orders")}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Delivery Order</h3>
                <p className="text-sm text-muted-foreground">View all orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/orders/new")}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <PlusCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Order Creation</h3>
                <p className="text-sm text-muted-foreground">Create new order</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/warehouse/maintenance")}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Wrench className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Stock Management</h3>
                <p className="text-sm text-muted-foreground">Manage inventory</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/orders/assigned")}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <TruckIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Assigned Order List</h3>
                <p className="text-sm text-muted-foreground">View assigned orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/billing/deposits")}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Collection Deposits</h3>
                <p className="text-sm text-muted-foreground">Manage deposits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Dashboard Counters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Order</p>
                <p className="text-2xl font-bold">{overallStats.total_order}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'all' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => handleTileClick('validated')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Validated</p>
                <p className="text-2xl font-bold">{overallStats.validated}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'pending_print' ? 'border-2 border-yellow-500' : ''}`}
          onClick={() => handleTileClick('pending_print')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Print</p>
                <p className="text-2xl font-bold">{overallStats.pending_print}</p>
              </div>
              <FileText className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'printed' ? 'border-2 border-blue-500' : ''}`}
          onClick={() => handleTileClick('printed')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Printed</p>
                <p className="text-2xl font-bold">{overallStats.printed}</p>
              </div>
              <Printer className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleTileClick('assigned')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assigned</p>
                <p className="text-2xl font-bold">{overallStats.loaded}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'postponed' ? 'border-2 border-red-500' : ''}`}
          onClick={() => handleTileClick('postponed')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Postponed</p>
                <p className="text-2xl font-bold">{overallStats.postponed}</p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignment Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Memo & Packing list</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="employee">Assign DA (Employee)</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={employeesLoading || assigning}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employeesLoading ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading employees...</div>
                  ) : employees.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No employees available</div>
                  ) : (
                    employees
                      .filter((emp) => emp.is_active !== false)
                      .map((employee) => {
                        const fullName = `${employee.first_name}${employee.last_name ? ` ${employee.last_name}` : ''}`.trim();
                        return (
                          <SelectItem key={employee.id} value={String(employee.id)}>
                            {fullName} ({employee.employee_id})
                          </SelectItem>
                        );
                      })
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="vehicle">Assign Vehicle</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle} disabled={vehiclesLoading || assigning}>
                <SelectTrigger id="vehicle">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehiclesLoading ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading vehicles...</div>
                  ) : vehicles.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No vehicles available</div>
                  ) : (
                    vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                        {vehicle.registration_number} {(vehicle.vehicle_type || vehicle.model) ? `(${vehicle.vehicle_type || vehicle.model})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePrint} disabled={selectedOrders.length === 0 || printing || ordersLoading}>
                {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                Print
              </Button>
              <Button onClick={handleAssign} disabled={selectedOrders.length === 0 || !selectedEmployee || !selectedVehicle || assigning || ordersLoading}>
                {assigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
                Assign
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  placeholder="Search by order number, customer, or route..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="route">Route</Label>
              <Select value={routeFilter} onValueChange={setRouteFilter}>
                <SelectTrigger id="route">
                  <SelectValue placeholder="All routes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All routes</SelectItem>
                  {uniqueRoutes.map((route) => (
                    <SelectItem key={route} value={route}>
                      {route}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending_print">Pending Print</SelectItem>
                  <SelectItem value="printed">Printed</SelectItem>
                  <SelectItem value="loaded">Assigned</SelectItem>
                  <SelectItem value="postponed">Postponed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Select All for Filtered Orders */}
      {filteredRouteCards.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
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
              <Label className="text-sm font-medium">
                Select All Filtered Orders
                {selectedOrders.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({selectedOrders.length} selected)
                  </span>
                )}
              </Label>
              {statusFilter !== "all" && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Filter: {statusFilter === "pending_print" ? "Pending Print" : statusFilter === "printed" ? "Printed" : statusFilter === "loaded" ? "Assigned" : statusFilter}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Cards with Orders */}
      <div className="space-y-4">
        {ordersLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading orders…</p>
            </CardContent>
          </Card>
        ) : filteredRouteCards.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No routes found.</p>
            </CardContent>
          </Card>
        ) : (
          filteredRouteCards.map((route) => {
            const isRouteExpanded = expandedRoutes[route.routeCode];
            const routeOrders = route.orders;
            const allRouteOrdersSelected = routeOrders.length > 0 && routeOrders.every((o) => selectedOrders.includes(o.orderId));
            
            return (
              <Card key={route.routeCode} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleExpand(route.routeCode)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:text-foreground"
                        aria-label={isRouteExpanded ? "Collapse route" : "Expand route"}
                      >
                        {isRouteExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{route.routeName}</CardTitle>
                          <span className="inline-flex items-center rounded-full text-white font-bold shadow-lg px-3 py-1.5 text-xs" style={{ backgroundColor: '#4f46e5' }}>
                            {route.routeCode}
                          </span>
                          <span className="inline-flex items-center rounded-full text-white font-bold shadow-lg px-3 py-1.5 text-xs" style={{ backgroundColor: route.status === "Active" ? '#10b981' : '#64748b' }}>
                            {route.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                          <span>Total Amount: <span className="font-semibold text-foreground">৳{formatPrice(route.totalAmount)}</span></span>
                          <span>Orders: <span className="font-semibold text-foreground">{route.totalOrderCount}</span></span>
                          <span>Validated: <span className="font-semibold text-foreground">{route.validatedCount}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {isRouteExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Select All Checkbox */}
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Checkbox
                          checked={allRouteOrdersSelected}
                          onCheckedChange={(checked) => handleSelectAll(Boolean(checked), routeOrders)}
                          disabled={ordersLoading}
                        />
                        <Label className="text-sm font-medium">Select All Orders</Label>
                      </div>
                      
                      {/* Order Cards */}
                      {routeOrders.map((order) => {
                        const isOrderExpanded = expandedOrders[order.orderId];
                        const isSelected = selectedOrders.includes(order.orderId);
                        return (
                          <Card key={order.orderId} className={`border-2 ${isSelected ? 'border-primary bg-primary/5' : ''}`}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleSelectOrder(order.orderId, Boolean(checked))}
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <CardTitle className="text-base mb-1.5">
                                      {order.memoNumber || order.orderNumber || `Memo #${order.orderId}`}
                                    </CardTitle>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground text-[10px]">Customer:</span>
                                        <span className="font-medium">{order.customerName}</span>
                                        <span className="text-muted-foreground">({order.customerCode})</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground text-[10px]">Amount:</span>
                                        <span className="font-semibold">৳{formatPrice(order.totalAmount)}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground text-[10px]">Discount:</span>
                                        <span className="font-medium">৳{formatPrice(order.totalDiscount)}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground text-[10px]">Items:</span>
                                        <span className="font-medium">{order.totalItems}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground text-[10px]">PSO:</span>
                                        <span className="font-medium">{order.psoName}</span>
                                        <span className="text-muted-foreground">({order.psoCode})</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground text-[10px]">Order:</span>
                                        <span className="font-medium">{order.orderNumber || "—"}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <div className="flex flex-wrap gap-1.5 justify-end">
                                      {order.postponed && (
                                        <span className="inline-flex items-center rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1 shadow-lg ring-2 ring-rose-400/60" style={{ backgroundColor: '#e11d48' }}>
                                          Postponed
                                        </span>
                                      )}
                                      {order.printed && (
                                        <span className="inline-flex items-center rounded-full bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs px-3 py-1 shadow-lg ring-2 ring-teal-300/60" style={{ backgroundColor: '#14b8a6' }}>
                                          Printed
                                        </span>
                                      )}
                                      {order.loaded && (
                                        <span className="inline-flex items-center rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs px-3 py-1 shadow-lg ring-2 ring-violet-400/60" style={{ backgroundColor: '#7c3aed' }}>
                                          Assigned
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => toggleOrderExpand(order.orderId)}
                                      className="flex h-8 w-8 items-center justify-center rounded border bg-background text-muted-foreground transition hover:text-foreground"
                                      aria-label={isOrderExpanded ? "Collapse order" : "Expand order"}
                                    >
                                      {isOrderExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                              {isOrderExpanded && (
                                <CardContent className="pt-0">
                                  <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                      <TableHeader className="bg-muted/50">
                                        <TableRow className="uppercase text-xs text-muted-foreground tracking-wide">
                                          <TableHead>Product code</TableHead>
                                          <TableHead>Size</TableHead>
                                          <TableHead className="text-right">Free goods</TableHead>
                                          <TableHead className="text-right">Total Qty</TableHead>
                                          <TableHead className="text-right">Unit Price</TableHead>
                                          <TableHead>Use code</TableHead>
                                          <TableHead className="text-right">Price - Dis.%</TableHead>
                                          <TableHead className="text-right">Total Price</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {order.items.map((item) => {
                                          const parsePrice = (value: any): number => {
                                            if (value === null || value === undefined || value === '') return 0;
                                            if (typeof value === 'number') {
                                              return (!isNaN(value) && isFinite(value) && value >= 0) ? value : 0;
                                            }
                                            const num = Number(value);
                                            return (!isNaN(num) && isFinite(num) && num >= 0) ? num : 0;
                                          };
                                          
                                          const unitPrice = parsePrice(item.unit_price);
                                          const discountPercent = parsePrice(item.discount_percent);
                                          const totalPrice = parsePrice(item.total_price);
                                          const priceAfterDiscount = Number(unitPrice) * (1 - Number(discountPercent) / 100);
                                          
                                          return (
                                            <TableRow key={item.id} className="text-sm">
                                              <TableCell className="font-mono text-xs">{item.product_code}</TableCell>
                                              <TableCell>{item.size || "—"}</TableCell>
                                              <TableCell className="text-right">{item.free_goods}</TableCell>
                                              <TableCell className="text-right">{item.total_quantity}</TableCell>
                                              <TableCell className="text-right">৳{formatPrice(unitPrice)}</TableCell>
                                              <TableCell className="text-right">৳{formatPrice(priceAfterDiscount)} ({discountPercent}%)</TableCell>
                                              <TableCell className="text-right font-medium">৳{formatPrice(totalPrice)}</TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </CardContent>
                              )}
                            </Card>
                          );
                        })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </main>
  );
}
