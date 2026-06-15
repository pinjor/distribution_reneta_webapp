import { Car, Users, Route, Receipt, TrendingUp, LucideIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { shineHoverClasses } from "@/components/ui/shine-hover";

const NAV_ITEMS: { title: string; path: string; icon: LucideIcon; color: string; ring: string }[] = [
  { title: "Vehicles", path: "/transport/vehicles", icon: Car, color: "bg-blue-500", ring: "ring-blue-200 dark:ring-blue-800" },
  { title: "Drivers", path: "/transport/drivers", icon: Users, color: "bg-emerald-500", ring: "ring-emerald-200 dark:ring-emerald-800" },
  { title: "Trips", path: "/transport/trips", icon: Route, color: "bg-violet-500", ring: "ring-violet-200 dark:ring-violet-800" },
  { title: "Expenses", path: "/transport/expenses", icon: Receipt, color: "bg-amber-500", ring: "ring-amber-200 dark:ring-amber-800" },
  { title: "Reports", path: "/transport/reports", icon: TrendingUp, color: "bg-orange-500", ring: "ring-orange-200 dark:ring-orange-800" },
];

export function TransportQuickNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {NAV_ITEMS.map((item) => {
        const active = location.pathname === item.path;
        return (
          <Card
            key={item.path}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-2",
              active
                ? "border-primary shadow-md bg-primary/5"
                : "hover:border-primary/30",
            )}
            onClick={() => navigate(item.path)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md ring-2",
                  shineHoverClasses,
                  item.color,
                  item.ring,
                )}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <span className={cn("text-sm font-semibold", active && "text-primary")}>
                {item.title}
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
