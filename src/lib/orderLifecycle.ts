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
    gradient: "from-[#0096D6] to-[#0077C0]",
    ring: "ring-[#0096D6]/30",
    glow: "shadow-[#0096D6]/40",
  },
  {
    id: 2,
    key: "validation",
    title: "Validation",
    subtitle: "Approve & reserve stock",
    icon: FileCheck,
    path: "/orders",
    gradient: "from-slate-500 to-slate-600",
    ring: "ring-slate-300/40",
    glow: "shadow-slate-500/30",
  },
  {
    id: 3,
    key: "route_wise",
    title: "Route Wise",
    subtitle: "Route memo lists",
    icon: MapPinned,
    path: "/orders/route-wise",
    gradient: "from-violet-500 to-violet-600",
    ring: "ring-violet-300/40",
    glow: "shadow-violet-500/30",
  },
  {
    id: 4,
    key: "assignment",
    title: "Assignment",
    subtitle: "Load & dispatch",
    icon: TruckIcon,
    path: "/orders/assigned",
    gradient: "from-orange-500 to-orange-600",
    ring: "ring-orange-300/40",
    glow: "shadow-orange-500/30",
  },
  {
    id: 5,
    key: "delivery",
    title: "Delivery",
    subtitle: "Mobile field delivery",
    icon: Truck,
    path: "/orders/assigned",
    gradient: "from-emerald-500 to-emerald-600",
    ring: "ring-emerald-300/40",
    glow: "shadow-emerald-500/30",
  },
  {
    id: 6,
    key: "collection",
    title: "Collection",
    subtitle: "Approve collections",
    icon: CheckCircle2,
    path: "/orders/collection-approval",
    gradient: "from-teal-500 to-teal-600",
    ring: "ring-teal-300/40",
    glow: "shadow-teal-500/30",
  },
  {
    id: 7,
    key: "billing",
    title: "Billing",
    subtitle: "Deposits & cash",
    icon: Coins,
    path: "/billing/deposits",
    gradient: "from-amber-500 to-amber-600",
    ring: "ring-amber-300/40",
    glow: "shadow-amber-500/30",
  },
  {
    id: 8,
    key: "mis_report",
    title: "MIS Report",
    subtitle: "Lifecycle analytics",
    icon: FileBarChart,
    path: "/orders/mis-report",
    gradient: "from-indigo-500 to-indigo-600",
    ring: "ring-indigo-300/40",
    glow: "shadow-indigo-500/30",
  },
];

export const LIFECYCLE_STEP_MAP = Object.fromEntries(
  ORDER_LIFECYCLE_STEPS.map((s) => [s.key, s]),
) as Record<OrderLifecycleKey, OrderLifecycleStepDef>;

export function getLifecycleStepLabel(key: string): string {
  return LIFECYCLE_STEP_MAP[key as OrderLifecycleKey]?.title ?? key;
}
