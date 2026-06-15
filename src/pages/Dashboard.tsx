import { useEffect, useMemo } from "react";
import {
  Package,
  Truck,
  FileCheck,
  TruckIcon,
  ClipboardList,
  PlusCircle,
  MapPinned,
  CheckCircle2,
  Coins,
  FileBarChart,
  LayoutGrid,
  BarChart3,
  Warehouse,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { StockChart } from "@/components/dashboard/StockChart";
import { DispatchChart } from "@/components/dashboard/DispatchChart";
import { ExpiryAlerts } from "@/components/dashboard/ExpiryAlerts";
import { OrderStatusCard } from "@/components/dashboard/OrderStatusCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { NavTileCard } from "@/components/ui/tile-card";
import { brandLabelClasses } from "@/lib/brandTheme";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const QUICK_ACTIONS = [
  { title: "New Order", icon: PlusCircle, path: "/orders/new" },
  { title: "Delivery Orders", icon: ClipboardList, path: "/orders" },
  { title: "Distribution Cockpit", icon: LayoutGrid, path: "/distribution/cockpit" },
  { title: "Stock Maintenance", icon: Warehouse, path: "/warehouse/maintenance" },
  { title: "Collection Reports", icon: BarChart3, path: "/billing/reports" },
  { title: "MIS Report", icon: FileBarChart, path: "/orders/mis-report" },
];

const STATUS_ROUTES: Record<string, string> = {
  "Pending Validation": "/orders",
  Validated: "/orders/route-wise",
  Assigned: "/orders/assigned",
  "Fully Delivered": "/orders/remaining-cash-list?status_filter=Fully Collected",
  "Partial Delivered": "/orders/remaining-cash-list?status_filter=Partially Collected",
  Postponed: "/orders/remaining-cash-list?status_filter=Postponed",
  "Pending Collection": "/orders/remaining-cash-list?status_filter=Pending",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Dashboard | Renata";
  }, []);

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: apiEndpoints.dashboard.kpis,
  });

  const formatNumber = (num: number | undefined) =>
    num === undefined ? "0" : num.toLocaleString();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ""}`
    : "there";

  const om = kpis?.order_management;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={greeting}
        title={displayName}
        subtitle="Distribution operations overview - track orders from creation through billing and MIS."
        icon={LayoutGrid}
        variant="sky"
        actions={(
          <>
            <Button
              variant="headerAction"
              size="sm"
              onClick={() => navigate("/distribution/cockpit")}
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Open Cockpit
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm"
              onClick={() => navigate("/orders/new")}
            >
              <PlusCircle className="h-4 w-4 mr-1.5" />
              New Order
            </Button>
          </>
        )}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Stock"
          value={isLoading ? "..." : formatNumber(kpis?.total_stock)}
          icon={Package}
          description="Units across all depots"
          accent="blue"
        />
        <KPICard
          title="Orders Today"
          value={isLoading ? "..." : formatNumber(kpis?.orders_today)}
          icon={Truck}
          description="New orders received today"
          accent="emerald"
        />
        <KPICard
          title="Validated"
          value={isLoading ? "..." : formatNumber(kpis?.validated_today)}
          icon={FileCheck}
          description="Awaiting assignment"
          accent="indigo"
        />
        <KPICard
          title="Assigned"
          value={isLoading ? "..." : formatNumber(kpis?.assigned_today)}
          icon={TruckIcon}
          description="Loaded & dispatched"
          accent="violet"
        />
      </div>

      {/* Order status grid */}
      <Card className="card-elevated border border-emerald-200/60 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50/30 via-card to-card dark:from-emerald-950/15 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <span className="block">Order Management Status</span>
              <span className="text-sm font-normal text-muted-foreground">
                Live counts across each stage of the order pipeline
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-4">
            <OrderStatusCard
              status="Pending Validation"
              count={om?.pending_validation ?? 0}
              onClick={() => navigate(STATUS_ROUTES["Pending Validation"])}
            />
            <OrderStatusCard
              status="Validated"
              count={om?.validated ?? 0}
              onClick={() => navigate(STATUS_ROUTES["Validated"])}
            />
            <OrderStatusCard
              status="Assigned"
              count={om?.assigned ?? 0}
              onClick={() => navigate(STATUS_ROUTES["Assigned"])}
            />
            <OrderStatusCard
              status="Fully Delivered"
              count={om?.fully_delivered ?? 0}
              onClick={() => navigate(STATUS_ROUTES["Fully Delivered"])}
            />
            <OrderStatusCard
              status="Partial Delivered"
              count={om?.partially_delivered ?? 0}
              onClick={() => navigate(STATUS_ROUTES["Partial Delivered"])}
            />
            <OrderStatusCard
              status="Postponed"
              count={om?.postponed ?? 0}
              onClick={() => navigate(STATUS_ROUTES["Postponed"])}
            />
            <OrderStatusCard
              status="Pending Collection"
              count={om?.pending_collection ?? 0}
              onClick={() => navigate(STATUS_ROUTES["Pending Collection"])}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div>
        <h2 className={cn("text-lg font-semibold mb-3", brandLabelClasses)}>Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <NavTileCard
              key={action.path}
              title={action.title}
              icon={action.icon}
              onClick={() => navigate(action.path)}
              className="[&_.flex]:flex-col [&_.flex]:items-center [&_.flex]:text-center [&_h3]:text-sm"
            />
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <StockChart />
        <DispatchChart
          pending={om?.pending_validation}
          validated={om?.validated}
          assigned={om?.assigned}
          delivered={(om?.fully_delivered ?? 0) + (om?.partially_delivered ?? 0)}
        />
      </div>

      {/* Expiry alerts */}
      <ExpiryAlerts />
    </div>
  );
};

export default Dashboard;
