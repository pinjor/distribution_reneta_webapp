import { Package, Truck, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { StockChart } from "@/components/dashboard/StockChart";
import { DispatchChart } from "@/components/dashboard/DispatchChart";
import { ExpiryAlerts } from "@/components/dashboard/ExpiryAlerts";
import { Card } from "@/components/ui/card";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your warehouse operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Total Stock"
          value="47,892"
          icon={Package}
          description="Units across all depots"
          trend={{ value: 12, direction: "up" }}
        />
        <KPICard
          title="Orders Today"
          value="156"
          icon={Truck}
          description="New orders received"
          trend={{ value: 8, direction: "up" }}
        />
        <KPICard
          title="Dispatched"
          value="142"
          icon={CheckCircle}
          description="Orders sent out"
          trend={{ value: 5, direction: "up" }}
        />
        <KPICard
          title="Delivered"
          value="128"
          icon={CheckCircle}
          description="Successfully completed"
          trend={{ value: 3, direction: "down" }}
        />
        <KPICard
          title="Pending Approvals"
          value="23"
          icon={AlertTriangle}
          description="Requiring action"
        />
      </div>

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
