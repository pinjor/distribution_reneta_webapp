import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Coins,
  CheckCircle2,
  FileText,
  FileBarChart,
  TruckIcon,
  BarChart3,
  PackageSearch,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { NavTileCard } from "@/components/ui/tile-card";

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
    },
    {
      title: "Delivery Order",
      description: "View and manage order deliveries",
      icon: List,
      path: "/orders",
    },
    {
      title: "Route Wise Memo List",
      description: "Route-wise order overview and memo management",
      icon: MapPinned,
      path: "/orders/route-wise",
    },
    {
      title: "Assigned Order List",
      description: "View and approve assigned orders",
      icon: TruckIcon,
      path: "/orders/assigned",
    },
    {
      title: "Remaining Cash and Collection",
      description: "Manage remaining cash deposits and collections",
      icon: Coins,
      path: "/orders/remaining-cash-list",
    },
    {
      title: "Approval for Collection",
      description: "Approve mobile app collection requests",
      icon: CheckCircle2,
      path: "/orders/collection-approval",
    },
    {
      title: "Order Lifecycle Tracker",
      description: "Track an order number through each pipeline stage",
      icon: PackageSearch,
      path: "/orders/tracking",
    },
    {
      title: "MIS Report",
      description: "View comprehensive memo lifecycle reports",
      icon: FileBarChart,
      path: "/orders/mis-report",
    },
    // Stock Management
    {
      title: "Stock Receipt",
      description: "Receive stock from suppliers",
      icon: PackagePlus,
      path: "/warehouse/receipt",
    },
    {
      title: "Stock Management",
      description: "Manage inventory and stock levels",
      icon: Wrench,
      path: "/warehouse/maintenance",
    },
    {
      title: "New Adjustment",
      description: "Create stock adjustments",
      icon: AlertCircle,
      path: "/warehouse/adjustment/new",
    },
    {
      title: "Adjustment Request",
      description: "View adjustment requests",
      icon: List,
      path: "/warehouse/adjustment/request",
    },
    // Delivery Management
    {
      title: "Depot Transfer",
      description: "Transfer stock between depots",
      icon: Warehouse,
      path: "/delivery/depot",
    },
    {
      title: "Sample Gift Delivery",
      description: "Manage sample and gift deliveries",
      icon: Gift,
      path: "/delivery/sample-gift",
    },
    {
      title: "Export",
      description: "Manage export deliveries",
      icon: Globe,
      path: "/delivery/export",
    },
    // Billing
    {
      title: "Collection Deposits",
      description: "Manage collection deposits",
      icon: FileText,
      path: "/billing/deposits",
    },
    {
      title: "Receive Remaining Cash",
      description: "Document remaining cash deposits from employees",
      icon: Coins,
      path: "/billing/deposits/remaining-cash",
    },
    {
      title: "Collection Reports",
      description: "View collection reports and analytics",
      icon: BarChart3,
      path: "/billing/reports",
    },
  ];

  const renderTileSection = (title: string, tiles: typeof navigationTiles) => (
    <div>
      <h2 className="text-xl font-semibold text-brand-deep mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <NavTileCard
            key={tile.path}
            title={tile.title}
            description={tile.description}
            icon={tile.icon}
            onClick={() => navigate(tile.path)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Distribution Cockpit"
        subtitle="Central hub for all distribution operations and management"
        icon={BarChart3}
        variant="sky"
      />

      <div className="space-y-6">
        {renderTileSection("Order Management", navigationTiles.slice(0, 8))}
        {renderTileSection("Stock Management", navigationTiles.slice(8, 12))}
        {renderTileSection("Delivery Management", navigationTiles.slice(12, 15))}
        {renderTileSection("Billing & Collection", navigationTiles.slice(15, 18))}
      </div>
    </div>
  );
}

