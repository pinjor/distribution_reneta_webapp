import type { LucideIcon } from "lucide-react";
import {
  Home,
  Package,
  Truck,
  Settings,
  PackagePlus,
  PackageMinus,
  Wrench,
  AlertCircle,
  PlusCircle,
  List,
  Car,
  Users,
  GitCompare,
  Building2,
  Warehouse,
  UserSquare2,
  UserCheck,
  Package2,
  MapPinned,
  ClipboardList,
  TruckIcon,
  Ruler,
  Tag,
  Gift,
  Globe,
  CheckCircle2,
  Coins,
  FileText,
  BarChart3,
  FileBarChart,
  Stethoscope,
  Store,
  Fuel,
  Route,
  Shield,
  PackageSearch,
  TrendingUp,
} from "lucide-react";

export interface MenuNavItem {
  title: string;
  description?: string;
  icon: LucideIcon;
  path: string;
  permission?: string;
}

export interface MenuNavSection {
  title: string;
  items: MenuNavItem[];
}

/** Sidebar + cockpit navigation — single source of truth for all menus */
export const SIDEBAR_MENU = [
  { title: "Dashboard", icon: Home, path: "/" },
  { title: "Distribution Cockpit", icon: MapPinned, path: "/distribution/cockpit" },
  {
    title: "Inventory Management",
    icon: Package,
    subItems: [
      { title: "Stock Receipt", icon: PackagePlus, path: "/warehouse/receipt", description: "Receive stock from suppliers", permission: "inventory.read" },
      { title: "Stock Management", icon: Wrench, path: "/warehouse/maintenance", description: "Manage inventory and stock levels", permission: "inventory.read" },
      {
        title: "Stock Adjustment",
        icon: AlertCircle,
        subItems: [
          { title: "New Adjustment", icon: PlusCircle, path: "/warehouse/adjustment/new", description: "Create stock adjustments", permission: "inventory.write" },
          { title: "Adjustment Request", icon: List, path: "/warehouse/adjustment/request", description: "View adjustment requests", permission: "inventory.read" },
        ],
      },
    ],
  },
  {
    title: "Stock Receive",
    icon: Package2,
    subItems: [
      { title: "Receive from Factory", icon: PlusCircle, path: "/receive/factory", description: "Record factory incoming stock", permission: "inventory.read" },
      { title: "Receive from Depot", icon: PackagePlus, path: "/receive/depot", description: "Receive transfers from other depots", permission: "inventory.read" },
      { title: "Stock Return Receive", icon: PackageMinus, path: "/receive/return", description: "Process returned stock receipts", permission: "inventory.read" },
      { title: "Opening Stock", icon: PackagePlus, path: "/receive/opening-stock", description: "Create and track initial stock requests", permission: "inventory.read" },
      { title: "All Receipts", icon: ClipboardList, path: "/receive/list", description: "Browse all receipt records", permission: "inventory.read" },
    ],
  },
  {
    title: "Order Management",
    icon: ClipboardList,
    subItems: [
      { title: "Sales Order", icon: PlusCircle, path: "/orders/new", description: "Create new sales orders", permission: "orders.write" },
      { title: "Delivery Order", icon: List, path: "/orders", description: "View and manage order deliveries", permission: "orders.read" },
      { title: "Route Wise Memo List", icon: MapPinned, path: "/orders/route-wise", description: "Route-wise order overview and memo management", permission: "orders.read" },
      { title: "Assigned Order List", icon: TruckIcon, path: "/orders/assigned", description: "View and approve assigned orders", permission: "orders.read" },
      { title: "Remaining Cash and Collection", icon: Coins, path: "/orders/remaining-cash-list", description: "Manage remaining cash deposits and collections", permission: "billing.read" },
      { title: "Approval for Collection", icon: CheckCircle2, path: "/orders/collection-approval", description: "Approve mobile app collection requests", permission: "billing.approve" },
      { title: "Order Lifecycle Tracker", icon: PackageSearch, path: "/orders/tracking", description: "Track an order through each pipeline stage", permission: "orders.read" },
      { title: "MIS Report", icon: FileBarChart, path: "/orders/mis-report", description: "View comprehensive memo lifecycle reports", permission: "reports.read" },
    ],
  },
  {
    title: "Others Delivery",
    icon: Truck,
    subItems: [
      { title: "Depot Transfer", icon: Warehouse, path: "/delivery/depot", description: "Transfer stock between depots", permission: "inventory.read" },
      { title: "Sample Gift Delivery", icon: Gift, path: "/delivery/sample-gift", description: "Manage sample and gift deliveries" },
      { title: "Export", icon: Globe, path: "/delivery/export", description: "Manage export deliveries" },
    ],
  },
  {
    title: "Transport Management",
    icon: Fuel,
    subItems: [
      { title: "Vehicles", icon: Car, path: "/transport/vehicles", description: "Manage fleet vehicles", permission: "orders.assign" },
      { title: "Drivers", icon: Users, path: "/transport/drivers", description: "Manage driver profiles", permission: "orders.assign" },
      { title: "Trip Assignment", icon: Route, path: "/transport/trips", description: "Assign trips and routes", permission: "orders.assign" },
      { title: "Expenses", icon: FileText, path: "/transport/expenses", description: "Track transport expenses", permission: "orders.assign" },
      { title: "Reports & Analytics", icon: TrendingUp, path: "/transport/reports", description: "Transport performance reports", permission: "orders.assign" },
    ],
  },
  {
    title: "Billing",
    icon: Coins,
    subItems: [
      { title: "Collection Deposits", icon: FileText, path: "/billing/deposits", description: "Manage collection deposits", permission: "billing.read" },
      { title: "Receive Remaining Cash", icon: Coins, path: "/billing/deposits/remaining-cash", description: "Document remaining cash from employees", permission: "billing.approve" },
      { title: "Collection Reports", icon: BarChart3, path: "/billing/reports", description: "View collection reports and analytics", permission: "billing.read" },
      { title: "Reconciliation", icon: GitCompare, path: "/distribution/reconciliation", description: "Reconcile collections and deposits", permission: "reconciliation.read" },
    ],
  },
  {
    title: "Platform",
    icon: Shield,
    subItems: [
      { title: "Audit Logs", icon: FileText, path: "/platform/audit-logs", description: "Review system audit trail", permission: "audit.read" },
      { title: "Report Center", icon: BarChart3, path: "/platform/reports", description: "Run and export platform reports", permission: "reports.read" },
    ],
  },
  {
    title: "Master Data",
    icon: Settings,
    subItems: [
      { title: "Company", icon: Building2, path: "/settings/company", description: "Company master settings" },
      { title: "Depot", icon: Warehouse, path: "/settings/depot", description: "Depot locations and capacity" },
      { title: "Employees", icon: UserSquare2, path: "/settings/employees", description: "Employee records and roles", permission: "admin.users" },
      { title: "Customers", icon: UserCheck, path: "/settings/customers", description: "Customer master data" },
      { title: "Vendors", icon: Users, path: "/settings/vendors", description: "Vendor and supplier records" },
      { title: "Products", icon: Package, path: "/settings/products", description: "Product catalog management" },
      { title: "Shipping Points", icon: MapPinned, path: "/settings/shipping-points", description: "Shipping point configuration" },
      { title: "Route Shipping Points", icon: Route, path: "/settings/route-shipping-points", description: "Route-to-shipping point mapping" },
      { title: "UOM", icon: Ruler, path: "/settings/uom", description: "Units of measure setup" },
      { title: "Primary Packaging", icon: Package2, path: "/settings/primary-packaging", description: "Packaging type definitions" },
      { title: "Price Setup", icon: Tag, path: "/settings/price-setup", description: "Product pricing configuration" },
      { title: "Role Master", icon: Users, path: "/settings/role-master", description: "Roles and permissions", permission: "admin.roles" },
      { title: "Chemist Shop", icon: Store, path: "/settings/chemist-shop", description: "Chemist shop master data" },
      { title: "Doctor", icon: Stethoscope, path: "/settings/doctor", description: "Doctor master records" },
      { title: "Vehicles", icon: Car, path: "/distribution/vehicles", description: "Distribution fleet vehicles" },
      { title: "Drivers", icon: Users, path: "/distribution/drivers", description: "Distribution drivers" },
    ],
  },
] as const;

function flattenSubItems(subItems: readonly any[]): MenuNavItem[] {
  const result: MenuNavItem[] = [];
  for (const item of subItems) {
    if (item.subItems) {
      result.push(...flattenSubItems(item.subItems));
    } else if (item.path) {
        result.push({
        title: item.title,
        description: item.description ?? `Open ${item.title}`,
        icon: item.icon,
        path: item.path,
        permission: item.permission,
      });
    }
  }
  return result;
}

function allowsItem(item: { permission?: string }, permissions: readonly string[] | null): boolean {
  if (!item.permission) return true;
  if (!permissions) return false;
  return permissions.includes(item.permission);
}

/** Drop entries whose permission is missing. Parents with no visible children are dropped. */
export function filterSidebarMenu<T extends { permission?: string; subItems?: readonly any[] }>(
  items: readonly T[],
  permissions: readonly string[] | null,
): T[] {
  const visible: T[] = [];
  for (const item of items) {
    if (item.subItems) {
      const subItems = filterSidebarMenu(item.subItems, permissions);
      if (subItems.length > 0) {
        visible.push({ ...item, subItems });
      }
    } else if (allowsItem(item, permissions)) {
      visible.push(item);
    }
  }
  return visible;
}

/** All navigable sections for Distribution Cockpit card grid */
export function getCockpitSections(permissions: readonly string[] | null = null): MenuNavSection[] {
  return filterSidebarMenu(SIDEBAR_MENU, permissions)
    .filter((item) => "subItems" in item && item.subItems)
    .map((section) => ({
      title: section.title,
      items: flattenSubItems(section.subItems),
    }));
}
