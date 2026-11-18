import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  ClipboardList,
  Coins,
  FileBarChart,
  MapPinned,
  PackageSearch,
  PlusCircle,
  Truck,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { OrderBreadcrumb } from "@/components/layout/OrderBreadcrumb";
import { cn } from "@/lib/utils";

import {
  fieldClass,
  labelClass,
  selectPanelClass,
  selectItemClass,
  fieldWrapClass,
  requiredMark,
  dialogContentClass,
  KpiCard,
} from "@/components/transport/transportUi";

export {
  fieldClass,
  labelClass,
  selectPanelClass,
  selectItemClass,
  fieldWrapClass,
  requiredMark,
  dialogContentClass,
  KpiCard,
};

export const panelClass =
  "rounded-xl border border-[#E3EAF3] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#2C3B50] dark:bg-[#151F30]";

export const tableHeadClass =
  "bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wide text-[#64748B] dark:bg-[#1B283B] dark:text-[#A9B8CC]";

export const numberInputClass =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export const filterTriggerClass =
  "h-8 w-auto min-w-[11.25rem] gap-2 rounded-lg border border-[#CBD5E1] bg-white px-2 text-[13px] shadow-none focus:ring-0 focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]";

export type FilterSelectItem = {
  value: string;
  label: string;
  icon?: LucideIcon;
};

export function FilterSelect({
  id,
  label,
  value,
  onValueChange,
  placeholder,
  icon: Icon,
  items,
  disabled,
  triggerClassName,
  emptyMessage,
}: {
  id?: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  icon: LucideIcon;
  items: FilterSelectItem[];
  disabled?: boolean;
  triggerClassName?: string;
  emptyMessage?: string;
}) {
  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label={label} className={cn(filterTriggerClass, triggerClassName)}>
        {!value ? <Icon className="h-3.5 w-3.5 shrink-0 text-[#0C4DA1]" aria-hidden /> : null}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={selectPanelClass}>
        {items.length === 0 ? (
          <div className="px-3 py-2 text-[13px] text-[#64748B]">{emptyMessage || "No options"}</div>
        ) : (
          items.map((item) => {
            const ItemIcon = item.icon ?? Icon;
            return (
              <SelectItem key={item.value} value={item.value} className={selectItemClass}>
                <span className="inline-flex min-w-0 items-center gap-2">
                  <ItemIcon className="h-3.5 w-3.5 shrink-0 text-[#0C4DA1]" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </span>
              </SelectItem>
            );
          })
        )}
      </SelectContent>
    </Select>
  );
}

export const OM_NAV = [
  { title: "Sales Order", path: "/orders/new", icon: PlusCircle },
  { title: "Delivery Order", path: "/orders", icon: ClipboardList },
  { title: "Route Wise", path: "/orders/route-wise", icon: MapPinned },
  { title: "Assigned", path: "/orders/assigned", icon: Truck },
  { title: "Remaining Cash", path: "/orders/remaining-cash-list", icon: Coins },
  { title: "Collection Approval", path: "/orders/collection-approval", icon: CheckCircle2 },
  { title: "Tracker", path: "/orders/tracking", icon: PackageSearch },
  { title: "MIS Report", path: "/orders/mis-report", icon: FileBarChart },
] as const;

export function OrderPageShell({ children }: { children: ReactNode }) {
  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3">
        <OrderBreadcrumb />
        <OrderQuickNav />
        {children}
      </div>
    </ThemeScope>
  );
}

export function OrderQuickNav() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <nav aria-label="Order Management" className="max-w-full shrink-0">
      <div className="flex w-full min-w-0 flex-wrap gap-0.5 rounded-xl border border-[#E3EAF3] bg-[#F8FAFC] p-1 dark:border-[#2C3B50] dark:bg-[#1B283B]">
        {OM_NAV.map((item) => {
          const active =
            item.path === "/orders"
              ? location.pathname === "/orders"
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/orders"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors duration-150 sm:px-3 sm:text-[13px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/30",
                active
                  ? "text-[#0C4DA1] dark:text-[#70ADFF]"
                  : "text-[#64748B] hover:text-[#172B4D] dark:text-[#A9B8CC] dark:hover:text-[#F1F5F9]",
              )}
            >
              {active ? (
                <motion.span
                  layoutId={reduceMotion ? undefined : "om-nav-active"}
                  className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-[#0C4DA1]/15 dark:bg-[#151F30] dark:ring-[#70ADFF]/25"
                  transition={{ duration: reduceMotion ? 0 : 0.18 }}
                />
              ) : null}
              <Icon className="relative h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="relative whitespace-nowrap">{item.title}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export function OrderPageHeading({
  actions,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  if (!actions) return null;
  return <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>;
}

export function OrderPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(panelClass, className)}>{children}</div>;
}

export function FilterStat({
  title,
  value,
  icon: Icon,
  accent = "blue",
  active,
  onClick,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "blue" | "green" | "purple";
  active?: boolean;
  onClick?: () => void;
}) {
  const accentClass =
    accent === "green"
      ? "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]"
      : accent === "purple"
        ? "bg-[#F3E8FF] text-[#7C3AED] dark:bg-[#2E1064] dark:text-[#C4B5FD]"
        : "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]";

  const body = (
    <div className="flex items-center gap-3">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", accentClass)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 text-left">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#64748B] dark:text-[#A9B8CC]">{title}</p>
        <p className="text-xl font-semibold tabular-nums tracking-tight text-[#172B4D] dark:text-[#F1F5F9]">{value}</p>
      </div>
    </div>
  );

  const shell = cn(
    panelClass,
    "px-4 py-3 transition-shadow duration-150",
    active && "ring-1 ring-[#0C4DA1]/25",
    onClick && "hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]",
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(shell, "w-full text-left")}>
        {body}
      </button>
    );
  }

  return <div className={shell}>{body}</div>;
}
