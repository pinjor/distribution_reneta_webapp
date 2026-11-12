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
      { title: "Stock Receipt", icon: PackagePlus, path: "/warehouse/receipt", description: "Receive stock from suppliers" },
      { title: "Stock Management", icon: Wrench, path: "/warehouse/maintenance", description: "Manage inventory and stock levels" },
      {
        title: "Stock Adjustment",
        icon: AlertCircle,
        subItems: [
          { title: "New Adjustment", icon: PlusCircle, path: "/warehouse/adjustment/new", description: "Create stock adjustments" },
          { title: "Adjustment Request", icon: List, path: "/warehouse/adjustment/request", description: "View adjustment requests" },
        ],
      },
    ],
  },
  {
    title: "Stock Receive",
    icon: Package2,
    subItems: [
      { title: "Receive from Factory", icon: PlusCircle, path: "/receive/factory", description: "Record factory incoming stock" },
      { title: "Receive from Depot", icon: PackagePlus, path: "/receive/depot", description: "Receive transfers from other depots" },
      { title: "Stock Return Receive", icon: PackageMinus, path: "/receive/return", description: "Process returned stock receipts" },
      { title: "All Receipts", icon: ClipboardList, path: "/receive/list", description: "Browse all receipt records" },
    ],
  },
  {
    title: "Order Management",
    icon: ClipboardList,
    subItems: [
      { title: "Sales Order", icon: PlusCircle, path: "/orders/new", description: "Create new sales orders" },
      { title: "Delivery Order", icon: List, path: "/orders", description: "View and manage order deliveries" },
      { title: "Route Wise Memo List", icon: MapPinned, path: "/orders/route-wise", description: "Route-wise order overview and memo management" },
      { title: "Assigned Order List", icon: TruckIcon, path: "/orders/assigned", description: "View and approve assigned orders" },
      { title: "Remaining Cash and Collection", icon: Coins, path: "/orders/remaining-cash-list", description: "Manage remaining cash deposits and collections" },
      { title: "Approval for Collection", icon: CheckCircle2, path: "/orders/collection-approval", description: "Approve mobile app collection requests" },
      { title: "Order Lifecycle Tracker", icon: PackageSearch, path: "/orders/tracking", description: "Track an order through each pipeline stage" },
      { title: "MIS Report", icon: FileBarChart, path: "/orders/mis-report", description: "View comprehensive memo lifecycle reports" },
    ],
  },
  {
    title: "Others Delivery",
    icon: Truck,
    subItems: [
      { title: "Depot Transfer", icon: Warehouse, path: "/delivery/depot", description: "Transfer stock between depots" },
      { title: "Sample Gift Delivery", icon: Gift, path: "/delivery/sample-gift", description: "Manage sample and gift deliveries" },
      { title: "Export", icon: Globe, path: "/delivery/export", description: "Manage export deliveries" },
    ],
  },
  {
    title: "Transport Management",
    icon: Fuel,
    subItems: [
      { title: "Vehicles", icon: Car, path: "/transport/vehicles", description: "Manage fleet vehicles" },
      { title: "Drivers", icon: Users, path: "/transport/drivers", description: "Manage driver profiles" },
      { title: "Trip Assignment", icon: Route, path: "/transport/trips", description: "Assign trips and routes" },
      { title: "Expenses", icon: FileText, path: "/transport/expenses", description: "Track transport expenses" },
      { title: "Reports & Analytics", icon: TrendingUp, path: "/transport/reports", description: "Transport performance reports" },
    ],
  },
  {
    title: "Billing",
    icon: Coins,
    subItems: [
      { title: "Collection Deposits", icon: FileText, path: "/billing/deposits", description: "Manage collection deposits" },
      { title: "Receive Remaining Cash", icon: Coins, path: "/billing/deposits/remaining-cash", description: "Document remaining cash from employees" },
      { title: "Collection Reports", icon: BarChart3, path: "/billing/reports", description: "View collection reports and analytics" },
      { title: "Reconciliation", icon: GitCompare, path: "/distribution/reconciliation", description: "Reconcile collections and deposits" },
    ],
  },
  {
    title: "Platform",
    icon: Shield,
    subItems: [
      { title: "Audit Logs", icon: FileText, path: "/platform/audit-logs", description: "Review system audit trail" },
      { title: "Report Center", icon: BarChart3, path: "/platform/reports", description: "Run and export platform reports" },
    ],
  },
  {
    title: "Master Data",
    icon: Settings,
    subItems: [
      { title: "Company", icon: Building2, path: "/settings/company", description: "Company master settings" },
      { title: "Depot", icon: Warehouse, path: "/settings/depot", description: "Depot locations and capacity" },
      { title: "Employees", icon: UserSquare2, path: "/settings/employees", description: "Employee records and roles" },
      { title: "Customers", icon: UserCheck, path: "/settings/customers", description: "Customer master data" },
      { title: "Vendors", icon: Users, path: "/settings/vendors", description: "Vendor and supplier records" },
      { title: "Products", icon: Package, path: "/settings/products", description: "Product catalog management" },
      { title: "Shipping Points", icon: MapPinned, path: "/settings/shipping-points", description: "Shipping point configuration" },
      { title: "Route Shipping Points", icon: Route, path: "/settings/route-shipping-points", description: "Route-to-shipping point mapping" },
      { title: "UOM", icon: Ruler, path: "/settings/uom", description: "Units of measure setup" },
      { title: "Primary Packaging", icon: Package2, path: "/settings/primary-packaging", description: "Packaging type definitions" },
      { title: "Price Setup", icon: Tag, path: "/settings/price-setup", description: "Product pricing configuration" },
      { title: "Role Master", icon: Users, path: "/settings/role-master", description: "Roles and permissions" },
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
      });
    }
  }
  return result;
}

/** All navigable sections for Distribution Cockpit card grid */
export function getCockpitSections(): MenuNavSection[] {
  return SIDEBAR_MENU.filter((item): item is Extract<typeof SIDEBAR_MENU[number], { subItems: unknown }> => "subItems" in item).map(
    (section) => ({
      title: section.title,
      items: flattenSubItems(section.subItems),
    }),
  );
}

export interface PageTitleMeta {
  title: string;
  description?: string;
}

/** Flatten SIDEBAR_MENU leaf routes (exact existing menu titles). */
export function getNavigableMenuItems(): MenuNavItem[] {
  const items: MenuNavItem[] = [];
  for (const entry of SIDEBAR_MENU) {
    if ("path" in entry && entry.path) {
      items.push({
        title: entry.title,
        icon: entry.icon,
        path: entry.path,
      });
    }
    if ("subItems" in entry && entry.subItems) {
      items.push(...flattenSubItems(entry.subItems));
    }
  }
  return items;
}

/**
 * Routes that exist in the app but are not leaf entries in SIDEBAR_MENU.
 * Titles mirror existing PageHeader / document.title wording where available.
 */
const EXTRA_ROUTE_TITLES: PageTitleMeta & { path: string }[] = [
  { path: "/profile", title: "My Profile" },
  { path: "/masters", title: "Master Data" },
  { path: "/warehouse/issuance", title: "Stock Issuance" },
  { path: "/warehouse/issuance/loading", title: "Vehicle Loading" },
  { path: "/warehouse/adjustment", title: "Stock Adjustment" },
  { path: "/orders/distribution-cockpit", title: "Distribution Cockpit" },
  { path: "/orders/delivery", title: "Delivery Orders" },
  { path: "/orders/picking", title: "Packing Board" },
  { path: "/orders/picking/report", title: "Packing Report" },
  { path: "/orders/loading-request", title: "Loading Requests" },
  { path: "/orders/loading-request/new", title: "New Loading Request" },
  { path: "/orders/loading-list", title: "Vehicle Loading" },
  { path: "/distribution/routes", title: "Route Planning" },
  { path: "/delivery/depot/new", title: "New Depot Transfer" },
  { path: "/delivery/sample-gift/new", title: "New Sample Gift Delivery" },
  { path: "/delivery/export/new", title: "New Export Delivery" },
  { path: "/receive/report", title: "Receipt Report" },
];

function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  const bare = pathname.split("?")[0].split("#")[0];
  if (bare.length > 1 && bare.endsWith("/")) return bare.slice(0, -1);
  return bare || "/";
}

function matchLongestPrefix(
  pathname: string,
  candidates: Array<{ path: string; title: string; description?: string }>,
): PageTitleMeta | null {
  let best: { path: string; title: string; description?: string } | null = null;
  for (const candidate of candidates) {
    if (pathname === candidate.path) {
      return { title: candidate.title, description: candidate.description };
    }
    if (pathname.startsWith(`${candidate.path}/`)) {
      if (!best || candidate.path.length > best.path.length) {
        best = candidate;
      }
    }
  }
  return best ? { title: best.title, description: best.description } : null;
}

/**
 * Resolve the navbar page title from the current location.
 * Prefers exact SIDEBAR_MENU labels; uses longest-prefix among menu + extras for detail routes.
 */
export function resolvePageTitle(pathname: string): PageTitleMeta {
  const path = normalizePathname(pathname);
  const candidates = [
    ...getNavigableMenuItems().map((item) => ({
      path: item.path,
      title: item.title,
      description: item.description,
    })),
    ...EXTRA_ROUTE_TITLES,
  ];

  const exact = candidates.find((item) => item.path === path);
  if (exact) {
    return { title: exact.title, description: exact.description };
  }

  const prefix = matchLongestPrefix(path, candidates);
  if (prefix) return prefix;

  return { title: "RENATA DMS" };
}
