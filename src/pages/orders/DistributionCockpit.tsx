import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardList,
  PlusCircle,
  Package,
  Truck,
  Warehouse,
  Gift,
  Globe,
  PackagePlus,
  Wrench,
  AlertCircle,
  List,
  MapPinned,
  DollarSign,
  CheckCircle2,
  FileText,
} from "lucide-react";

export default function DistributionCockpit() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Distribution Cockpit | Renata";
  }, []);

  const navigationTiles = [
    // Order Management
    {
      title: "Sales Order",
      description: "Create new sales orders",
      icon: PlusCircle,
      path: "/orders/new",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "Delivery Order",
      description: "View and manage order deliveries",
      icon: ClipboardList,
      path: "/orders",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      title: "Route Wise Memo List",
      description: "Route-wise order overview and memo management",
      icon: MapPinned,
      path: "/orders/route-wise",
      color: "bg-purple-500 hover:bg-purple-600",
    },
    {
      title: "Assigned Order List",
      description: "View assigned orders",
      icon: Truck,
      path: "/orders/assigned",
      color: "bg-orange-500 hover:bg-orange-600",
    },
    {
      title: "Approval for Collection",
      description: "Approve and manage collection approvals",
      icon: CheckCircle2,
      path: "/orders/collection-approval",
      color: "bg-teal-500 hover:bg-teal-600",
    },
    {
      title: "MIS Report",
      description: "View comprehensive memo lifecycle reports",
      icon: FileText,
      path: "/orders/mis-report",
      color: "bg-indigo-500 hover:bg-indigo-600",
    },
    // Stock Management
    {
      title: "Stock Receipt",
      description: "Receive stock from suppliers",
      icon: PackagePlus,
      path: "/warehouse/receipt",
      color: "bg-indigo-500 hover:bg-indigo-600",
    },
    {
      title: "Stock Management",
      description: "Manage inventory and stock levels",
      icon: Wrench,
      path: "/warehouse/maintenance",
      color: "bg-teal-500 hover:bg-teal-600",
    },
    {
      title: "New Adjustment",
      description: "Create stock adjustments",
      icon: AlertCircle,
      path: "/warehouse/adjustment/new",
      color: "bg-yellow-500 hover:bg-yellow-600",
    },
    {
      title: "Adjustment Request",
      description: "View adjustment requests",
      icon: List,
      path: "/warehouse/adjustment/request",
      color: "bg-amber-500 hover:bg-amber-600",
    },
    // Delivery Management
    {
      title: "Depot Transfer",
      description: "Transfer stock between depots",
      icon: Warehouse,
      path: "/delivery/depot",
      color: "bg-cyan-500 hover:bg-cyan-600",
    },
    {
      title: "Sample Gift Delivery",
      description: "Manage sample and gift deliveries",
      icon: Gift,
      path: "/delivery/sample-gift",
      color: "bg-pink-500 hover:bg-pink-600",
    },
    {
      title: "Export",
      description: "Manage export deliveries",
      icon: Globe,
      path: "/delivery/export",
      color: "bg-violet-500 hover:bg-violet-600",
    },
    // Billing
    {
      title: "Collection Deposits",
      description: "Manage collection deposits",
      icon: DollarSign,
      path: "/billing/deposits",
      color: "bg-emerald-500 hover:bg-emerald-600",
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Distribution Cockpit</h1>
          <p className="text-muted-foreground mt-2">
            Central hub for all distribution operations and management
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Order Management Section */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Order Management</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {navigationTiles.slice(0, 7).map((tile) => (
              <Card
                key={tile.path}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
                onClick={() => navigate(tile.path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${tile.color} text-white`}>
                      <tile.icon className="h-6 w-6" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{tile.title}</h3>
                  <p className="text-sm text-muted-foreground">{tile.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stock Management Section */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Stock Management</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {navigationTiles.slice(7, 11).map((tile) => (
              <Card
                key={tile.path}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
                onClick={() => navigate(tile.path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${tile.color} text-white`}>
                      <tile.icon className="h-6 w-6" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{tile.title}</h3>
                  <p className="text-sm text-muted-foreground">{tile.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Delivery Management Section */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Delivery Management</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {navigationTiles.slice(11, 14).map((tile) => (
              <Card
                key={tile.path}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
                onClick={() => navigate(tile.path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${tile.color} text-white`}>
                      <tile.icon className="h-6 w-6" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{tile.title}</h3>
                  <p className="text-sm text-muted-foreground">{tile.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Billing Section */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Billing & Collection</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {navigationTiles.slice(14).map((tile) => (
              <Card
                key={tile.path}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
                onClick={() => navigate(tile.path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${tile.color} text-white`}>
                      <tile.icon className="h-6 w-6" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{tile.title}</h3>
                  <p className="text-sm text-muted-foreground">{tile.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

