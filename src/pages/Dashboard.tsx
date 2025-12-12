import { useEffect } from "react";
import { Package, Truck, CheckCircle, Clock, ClipboardList, FileCheck, TruckIcon, Coins, AlertCircle, XCircle } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { StockChart } from "@/components/dashboard/StockChart";
import { DispatchChart } from "@/components/dashboard/DispatchChart";
import { ExpiryAlerts } from "@/components/dashboard/ExpiryAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { TAG_COLORS } from "@/lib/tagColors";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    document.title = "Dashboard | Renata";
  }, []);

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: apiEndpoints.dashboard.kpis,
  });

  // Format numbers with commas
  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return "0";
    return num.toLocaleString();
  };

  const getStatusBadge = (status: string, count: number) => {
    const colorConfig = TAG_COLORS[status as keyof typeof TAG_COLORS] || TAG_COLORS["Pending"];
    
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer" onClick={() => {
        // Navigate to appropriate page based on status
        if (status === "Pending Validation") navigate("/orders");
        else if (status === "Validated") navigate("/orders/route-wise");
        else if (status === "Assigned") navigate("/orders/assigned");
        else if (status === "Fully Delivered") navigate("/orders/remaining-cash-list?status_filter=Fully Collected");
        else if (status === "Partial Delivered") navigate("/orders/remaining-cash-list?status_filter=Partially Collected");
        else if (status === "Postponed") navigate("/orders/remaining-cash-list?status_filter=Postponed");
        else if (status === "Pending Collection") navigate("/orders/remaining-cash-list?status_filter=Pending");
      }}>
        <div className="flex items-center gap-3">
          <span 
            className="inline-flex items-center rounded-full text-white font-bold text-xs px-2.5 py-1 shadow-lg ring-2"
            style={{ backgroundColor: colorConfig.bg }}
          >
            {status}
          </span>
          <span className="text-sm font-medium">{count}</span>
        </div>
        <span className="text-xs text-muted-foreground">orders</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your warehouse operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Stock"
          value={isLoading ? "..." : formatNumber(kpis?.total_stock)}
          icon={Package}
          description="Units across all depots"
          trend={!isLoading && kpis?.total_stock > 0 ? { value: 0, direction: "up" } : undefined}
        />
        <KPICard
          title="Orders Today"
          value={isLoading ? "..." : formatNumber(kpis?.orders_today)}
          icon={Truck}
          description="New orders received"
          trend={!isLoading && kpis?.orders_today > 0 ? { value: 0, direction: "up" } : undefined}
        />
        <KPICard
          title="Validated"
          value={isLoading ? "..." : formatNumber(kpis?.validated_today)}
          icon={FileCheck}
          description="Orders validated (not assigned)"
          trend={!isLoading && kpis?.validated_today > 0 ? { value: 0, direction: "up" } : undefined}
        />
        <KPICard
          title="Assigned"
          value={isLoading ? "..." : formatNumber(kpis?.assigned_today)}
          icon={TruckIcon}
          description="Orders assigned to vehicles"
          trend={!isLoading && kpis?.assigned_today > 0 ? { value: 0, direction: "up" } : undefined}
        />
      </div>

      {/* Order Management Section */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Order Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getStatusBadge("Pending Validation", kpis?.order_management?.pending_validation || 0)}
            {getStatusBadge("Validated", kpis?.order_management?.validated || 0)}
            {getStatusBadge("Assigned", kpis?.order_management?.assigned || 0)}
            {getStatusBadge("Fully Delivered", kpis?.order_management?.fully_delivered || 0)}
            {getStatusBadge("Partial Delivered", kpis?.order_management?.partially_delivered || 0)}
            {getStatusBadge("Postponed", kpis?.order_management?.postponed || 0)}
            {getStatusBadge("Pending Collection", kpis?.order_management?.pending_collection || 0)}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <StockChart />
        <DispatchChart />
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6 card-elevated">
            <h3 className="text-lg font-medium mb-4">Routes In Progress</h3>
            <div className="space-y-3">
              {[
                { route: "Route-A Central", driver: "John Smith", stops: 12, completed: 8, status: "active" },
                { route: "Route-B North", driver: "Sarah Johnson", stops: 10, completed: 10, status: "completed" },
                { route: "Route-C South", driver: "Mike Wilson", stops: 15, completed: 6, status: "active" },
                { route: "Route-D East", driver: "Emma Davis", stops: 8, completed: 3, status: "active" },
              ].map((route, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{route.route}</p>
                      <span className={`status-chip ${route.status === 'completed' ? 'status-success' : 'status-info'}`}>
                        {route.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Driver: {route.driver}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{route.completed}/{route.stops}</p>
                    <p className="text-xs text-muted-foreground">stops</p>
                  </div>
                  <div className="w-24">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${route.status === 'completed' ? 'bg-success' : 'bg-primary'}`}
                        style={{ width: `${(route.completed / route.stops) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <ExpiryAlerts />
      </div>
    </div>
  );
};

export default Dashboard;
