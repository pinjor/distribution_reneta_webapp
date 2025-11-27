import React, { useState, useMemo } from "react";
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
  ArrowLeft
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
  hasUnvalidatedOrders: boolean;
}

export default function RouteWiseOrderList() {
  const { toast } = useToast();
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [printing, setPrinting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [validatingRoutes, setValidatingRoutes] = useState<Set<string>>(new Set());
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
          hasUnvalidatedOrders: false,
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
        orderMap[orderId].loaded = item.loaded;
      });
      
      const orders = Object.values(orderMap);
      // Sort orders by orderId descending (most recent first - last in, first show)
      orders.sort((a, b) => b.orderId - a.orderId);
      
      const validatedCount = orders.filter(o => o.validated).length;
      const hasUnvalidated = orders.some(o => !o.validated);
      const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      
      routeMap[routeCode].orders = orders;
      routeMap[routeCode].validatedCount = validatedCount;
      routeMap[routeCode].totalOrderCount = orders.length;
      routeMap[routeCode].totalAmount = totalAmount;
      routeMap[routeCode].hasUnvalidatedOrders = hasUnvalidated;
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
          case "validated":
            return order.validated;
          case "pending_print":
            return order.validated && !order.printed;
          case "printed":
            return order.printed;
          case "loaded":
            return order.loaded;
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
            case "validated":
              return order.validated;
            case "pending_print":
              return order.validated && !order.printed;
            case "printed":
              return order.printed;
            case "loaded":
              return order.loaded;
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
      // Group selected orders by route
      const ordersByRoute: Record<string, number[]> = {};
      filteredOrders.forEach((order: any) => {
        if (selectedOrders.includes(order.orderId)) {
          const route = order.routeCode;
          if (!ordersByRoute[route]) {
            ordersByRoute[route] = [];
          }
          ordersByRoute[route].push(order.orderId);
        }
      });

      // Print for each route (generate and download PDF)
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
      
      toast({
        title: "Report generated",
        description: `Packing report downloaded for ${selectedOrders.length} order(s).`,
      });
      
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
      // Group selected orders by route
      const ordersByRoute: Record<string, number[]> = {};
      filteredOrders.forEach((order: any) => {
        if (selectedOrders.includes(order.orderId)) {
          const route = order.routeCode;
          if (!ordersByRoute[route]) {
            ordersByRoute[route] = [];
          }
          ordersByRoute[route].push(order.orderId);
        }
      });

      // Assign for each route
      for (const [routeCode, orderIds] of Object.entries(ordersByRoute)) {
        await apiEndpoints.orders.assignRouteWise({
          order_ids: orderIds,
          employee_id: Number(selectedEmployee),
          vehicle_id: Number(selectedVehicle),
          route_code: routeCode,
        });
      }
      
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

  const handleValidate = async (routeCode: string, selectedOrderIds?: number[]) => {
    try {
      setValidatingRoutes((prev) => new Set([...prev, routeCode]));
      
      // If specific orders are selected, validate only those
      // Otherwise, validate all unvalidated orders in the route
      const payload: any = {
        route_code: routeCode,
      };
      
      if (selectedOrderIds && selectedOrderIds.length > 0) {
        payload.order_ids = selectedOrderIds;
      }
      
      const response = await apiEndpoints.orders.validateRouteWise(payload);
      
      toast({
        title: "Validation successful",
        description: response.message || `Validated ${response.validated_count} order(s)`,
      });
      
      // Clear selection after validation
      if (selectedOrderIds && selectedOrderIds.length > 0) {
        setSelectedOrders((prev) => prev.filter((id) => !selectedOrderIds.includes(id)));
      }
      
      refetchOrders();
    } catch (error: any) {
      console.error("Failed to validate route", error);
      toast({
        title: "Validation failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setValidatingRoutes((prev) => {
        const next = new Set(prev);
        next.delete(routeCode);
        return next;
      });
    }
  };

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const total_order = filteredOrders.length;
    const validated = filteredOrders.filter((order) => order.validated).length;
    const printed = filteredOrders.filter((order) => order.printed).length;
    const pending_print = filteredOrders.filter((order) => order.validated && !order.printed).length;
    const loaded = filteredOrders.filter((order) => order.loaded).length;
    
    return {
      total_order,
      validated,
      printed,
      pending_print,
      loaded,
    };
  }, [filteredOrders]);

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
            <h1 className="text-2xl font-semibold text-foreground">Route Wise Order</h1>
            <p className="text-muted-foreground">
              Manage orders by route, print invoices, and assign to employees and vehicles.
            </p>
          </div>
        </div>
      </header>

      {/* Overall Dashboard Counters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
        <Card>
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
        <Card>
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
        <Card>
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Loaded</p>
                <p className="text-2xl font-bold">{overallStats.loaded}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-600" />
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
                  <SelectItem value="validated">Validated</SelectItem>
                  <SelectItem value="pending_print">Pending Print</SelectItem>
                  <SelectItem value="printed">Printed</SelectItem>
                  <SelectItem value="loaded">Loaded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
            const isValidating = validatingRoutes.has(route.routeCode);
            const routeOrders = route.orders;
            const allRouteOrdersSelected = routeOrders.length > 0 && routeOrders.every((o) => selectedOrders.includes(o.orderId));
            const someRouteOrdersSelected = routeOrders.some((o) => selectedOrders.includes(o.orderId));
            
            // Get selected orders for this route
            const selectedOrdersInRoute = routeOrders
              .filter((o) => selectedOrders.includes(o.orderId))
              .map((o) => o.orderId);
            
            // Check if selected orders are unvalidated
            const hasUnvalidatedSelected = selectedOrdersInRoute.length > 0 && 
              routeOrders.some((o) => selectedOrders.includes(o.orderId) && !o.validated);
            
            // Can validate if: has unvalidated orders in route OR has selected unvalidated orders
            const canValidateRoute = route.hasUnvalidatedOrders && !isValidating;
            const canValidateSelected = hasUnvalidatedSelected && !isValidating;
            
            // Determine which validate button to show
            const showSelectedValidate = selectedOrdersInRoute.length > 0;
            
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
                          <Badge variant="outline">{route.routeCode}</Badge>
                          <Badge variant={route.status === "Active" ? "default" : "secondary"}>
                            {route.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                          <span>Total Amount: <span className="font-semibold text-foreground">৳{formatPrice(route.totalAmount)}</span></span>
                          <span>Orders: <span className="font-semibold text-foreground">{route.totalOrderCount}</span></span>
                          <span>Validated: <span className="font-semibold text-foreground">{route.validatedCount}</span></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {showSelectedValidate && (
                        <Button
                          onClick={() => handleValidate(route.routeCode, selectedOrdersInRoute)}
                          disabled={!canValidateSelected}
                          variant={canValidateSelected ? "default" : "secondary"}
                          size="sm"
                        >
                          {isValidating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Validating...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Validate Selected ({selectedOrdersInRoute.length})
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        onClick={() => handleValidate(route.routeCode)}
                        disabled={!canValidateRoute}
                        variant={canValidateRoute ? "default" : "secondary"}
                      >
                        {isValidating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Validating...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Validate All
                          </>
                        )}
                      </Button>
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
                                    <div className="flex flex-wrap gap-1 justify-end">
                                      {order.validated && <Badge variant="default" className="bg-green-600 text-xs">Validated</Badge>}
                                      {order.printed && <Badge variant="default" className="bg-blue-600 text-xs">Printed</Badge>}
                                      {order.loaded && <Badge variant="default" className="bg-purple-600 text-xs">Loaded</Badge>}
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
