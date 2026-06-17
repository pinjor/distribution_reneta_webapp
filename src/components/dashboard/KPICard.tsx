import { LucideIcon, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { brandIconBoxClasses, brandLabelClasses, brandMutedClasses } from "@/lib/brandTheme";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  description?: string;
  index?: number;
}

export function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  index = 0,
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className="group h-full"
    >
      <div className="nav-tile-card relative h-full overflow-hidden rounded-2xl border-2 p-5 hover:-translate-y-0.5">
        <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-brand-from/10 blur-xl group-hover:bg-brand-from/20 transition-colors" />
        <div className="relative z-[1] flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium mb-1", brandMutedClasses)}>{title}</p>
            <h3 className={cn("text-3xl font-bold tracking-tight", brandLabelClasses)}>{value}</h3>
            {description && (
              <p className={cn("text-xs mt-1.5", brandMutedClasses)}>{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend.direction === "up" ? (
                  <TrendingUp className="h-4 w-4 text-brand-from" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-brand-to" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    trend.direction === "up" ? "text-brand-from" : "text-brand-to",
                  )}
                >
                  {Math.abs(trend.value)}%
                </span>
                <span className={cn("text-xs", brandMutedClasses)}>vs yesterday</span>
              </div>
            )}
          </div>
          <div className={cn("h-12 w-12 shrink-0 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110", brandIconBoxClasses)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <ArrowUpRight className="absolute top-4 right-4 h-3.5 w-3.5 text-brand-from/20 group-hover:text-brand-from/50 transition-colors" />
      </div>
    </motion.div>
  );
}
