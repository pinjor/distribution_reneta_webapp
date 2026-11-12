import { useEffect } from "react";
import {
  Package,
  Truck,
  FileCheck,
  TruckIcon,
  ClipboardList,
  PlusCircle,
  LayoutGrid,
  BarChart3,
  Warehouse,
  FileBarChart,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { StockChart } from "@/components/dashboard/StockChart";
import { DispatchChart } from "@/components/dashboard/DispatchChart";
import { ExpiryAlerts } from "@/components/dashboard/ExpiryAlerts";
import { OrderStatusCard } from "@/components/dashboard/OrderStatusCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickActionsGrid, QuickActionsHeading } from "@/components/navigation/QuickActionsGrid";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { brandLabelClasses, brandMutedClasses } from "@/lib/brandTheme";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { useNavigate } from "react-router-dom";

const QUICK_ACTIONS = [
  { title: "New Order", icon: PlusCircle, path: "/orders/new", description: "Create new sales orders" },
  { title: "Delivery Orders", icon: ClipboardList, path: "/orders", description: "View and manage order deliveries" },
  { title: "Distribution Cockpit", icon: LayoutGrid, path: "/distribution/cockpit", description: "Open the distribution operations hub" },
  { title: "Stock Maintenance", icon: Warehouse, path: "/warehouse/maintenance", description: "Manage inventory and stock levels" },
  { title: "Collection Reports", icon: BarChart3, path: "/billing/reports", description: "View collection reports and analytics" },
  { title: "MIS Report", icon: FileBarChart, path: "/orders/mis-report", description: "View comprehensive memo lifecycle reports" },
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

  useEffect(() => {
    document.title = "Dashboard | Renata";
  }, []);

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: apiEndpoints.dashboard.kpis,
  });

  const formatNumber = (num: number | undefined) =>
    num === undefined ? "0" : num.toLocaleString();

  const om = kpis?.order_management;

  return (
    <ThemeScope className="-mx-6 -my-6 min-h-full px-6 py-6">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Stock"
            value={isLoading ? "..." : formatNumber(kpis?.total_stock)}
            icon={Package}
            description="Units across all depots"
            index={0}
          />
          <KPICard
            title="Orders Today"
            value={isLoading ? "..." : formatNumber(kpis?.orders_today)}
            icon={Truck}
            description="New orders received today"
            index={1}
          />
          <KPICard
            title="Validated"
            value={isLoading ? "..." : formatNumber(kpis?.validated_today)}
            icon={FileCheck}
            description="Awaiting assignment"
            index={2}
          />
          <KPICard
            title="Assigned"
            value={isLoading ? "..." : formatNumber(kpis?.assigned_today)}
            icon={TruckIcon}
            description="Loaded & dispatched"
            index={3}
          />
        </div>

        {/* Order status grid */}
        <Card className="card-elevated border-2 border-brand-from/20 bg-card shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-from to-brand-to text-white shadow-md">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <span className={cn("block", brandLabelClasses)}>Order Management Status</span>
                <span className={cn("text-sm font-normal", brandMutedClasses)}>
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

        {/* Quick actions — includes New Order + Distribution Cockpit (formerly banner actions) */}
        <div>
          <QuickActionsHeading />
          <QuickActionsGrid actions={QUICK_ACTIONS} onNavigate={navigate} />
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
    </ThemeScope>
  );
};

export default Dashboard;
