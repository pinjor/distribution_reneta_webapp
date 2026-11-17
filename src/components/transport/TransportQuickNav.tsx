import { BarChart3, Receipt, Route, Truck, Users, type LucideIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { title: string; path: string; icon: LucideIcon }[] = [
  { title: "Vehicles", path: "/transport/vehicles", icon: Truck },
  { title: "Drivers", path: "/transport/drivers", icon: Users },
  { title: "Trips", path: "/transport/trips", icon: Route },
  { title: "Expenses", path: "/transport/expenses", icon: Receipt },
  { title: "Reports", path: "/transport/reports", icon: BarChart3 },
];

export function TransportQuickNav() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <nav aria-label="Transport modules" className="max-w-full">
      <div className="flex w-full min-w-0 gap-0.5 rounded-xl border border-[#E3EAF3] bg-[#F8FAFC] p-1 dark:border-[#2C3B50] dark:bg-[#1B283B]">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium transition-colors duration-150 sm:px-3",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/30",
                active
                  ? "text-[#0C4DA1] dark:text-[#70ADFF]"
                  : "text-[#64748B] hover:text-[#172B4D] dark:text-[#A9B8CC] dark:hover:text-[#F1F5F9]",
              )}
            >
              {active ? (
                <motion.span
                  layoutId={reduceMotion ? undefined : "transport-nav-active"}
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
