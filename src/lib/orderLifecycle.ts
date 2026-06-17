import type { LucideIcon } from "lucide-react";
import {
  PlusCircle,
  FileCheck,
  MapPinned,
  TruckIcon,
  Truck,
  CheckCircle2,
  Coins,
  FileBarChart,
} from "lucide-react";

/** Canonical 8-step order lifecycle — matches ORDER_MANAGEMENT documentation & Dashboard */
export type OrderLifecycleKey =
  | "order_creation"
  | "validation"
  | "route_wise"
  | "assignment"
  | "delivery"
  | "collection"
  | "billing"
  | "mis_report";

export type LifecycleStepStatus = "completed" | "current" | "pending" | "blocked";

export interface OrderLifecycleStepDef {
  id: number;
  key: OrderLifecycleKey;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  path: string;
  gradient: string;
  ring: string;
  glow: string;
}

export const ORDER_LIFECYCLE_STEPS: OrderLifecycleStepDef[] = [
  {
    id: 1,
    key: "order_creation",
    title: "Order Creation",
    subtitle: "Sales orders & memos",
    icon: PlusCircle,
    path: "/orders/new",
    gradient: "from-brand-from to-brand-to",
    ring: "ring-brand-from/30",
    glow: "shadow-brand-from/40",
  },
  {
    id: 2,
    key: "validation",
    title: "Validation",
    subtitle: "Approve & reserve stock",
    icon: FileCheck,
    path: "/orders",
    gradient: "from-brand-to to-brand-deep",
    ring: "ring-brand-to/30",
    glow: "shadow-brand-to/40",
  },
  {
    id: 3,
    key: "route_wise",
    title: "Route Wise",
    subtitle: "Route memo lists",
    icon: MapPinned,
    path: "/orders/route-wise",
    gradient: "from-brand-from to-brand-deep",
    ring: "ring-brand-from/30",
    glow: "shadow-brand-from/40",
  },
  {
    id: 4,
    key: "assignment",
    title: "Assignment",
    subtitle: "Load & dispatch",
    icon: TruckIcon,
    path: "/orders/assigned",
    gradient: "from-brand-to to-brand-from",
    ring: "ring-brand-to/30",
    glow: "shadow-brand-to/40",
  },
  {
    id: 5,
    key: "delivery",
    title: "Delivery",
    subtitle: "Mobile field delivery",
    icon: Truck,
    path: "/orders/assigned",
    gradient: "from-brand-from via-brand-to to-brand-deep",
    ring: "ring-brand-from/30",
    glow: "shadow-brand-from/40",
  },
  {
    id: 6,
    key: "collection",
    title: "Collection",
    subtitle: "Approve collections",
    icon: CheckCircle2,
    path: "/orders/collection-approval",
    gradient: "from-brand-deep to-brand-to",
    ring: "ring-brand-deep/30",
    glow: "shadow-brand-deep/40",
  },
  {
    id: 7,
    key: "billing",
    title: "Billing",
    subtitle: "Deposits & cash",
    icon: Coins,
    path: "/billing/deposits",
    gradient: "from-brand-from to-brand-to",
    ring: "ring-brand-from/25",
    glow: "shadow-brand-from/35",
  },
  {
    id: 8,
    key: "mis_report",
    title: "MIS Report",
    subtitle: "Lifecycle analytics",
    icon: FileBarChart,
    path: "/orders/mis-report",
    gradient: "from-brand-to to-brand-deep",
    ring: "ring-brand-to/30",
    glow: "shadow-brand-to/40",
  },
];

export const LIFECYCLE_STEP_MAP = Object.fromEntries(
  ORDER_LIFECYCLE_STEPS.map((s) => [s.key, s]),
) as Record<OrderLifecycleKey, OrderLifecycleStepDef>;

export function getLifecycleStepLabel(key: string): string {
  return LIFECYCLE_STEP_MAP[key as OrderLifecycleKey]?.title ?? key;
}
