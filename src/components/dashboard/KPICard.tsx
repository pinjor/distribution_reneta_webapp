import { LucideIcon, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
      <div className="relative h-full overflow-hidden rounded-2xl border border-[#D5E1F2] bg-white p-5 shadow-[0_12px_28px_-20px_rgba(12,76,161,0.55)] hover:-translate-y-0.5">
        <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[#0C4CA1]/10 blur-xl group-hover:bg-[#0C4CA1]/20 transition-colors" />
        <div className="relative z-[1] flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="mb-1 text-sm font-medium text-[#2C4A73]">{title}</p>
            <h3 className="text-3xl font-bold tracking-tight text-[#0C4CA1]">{value}</h3>
            {description && (
              <p className="mt-1.5 text-xs text-[#2C4A73]">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend.direction === "up" ? (
                  <TrendingUp className="h-4 w-4 text-[#0C4CA1]" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-[#08357A]" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    trend.direction === "up" ? "text-[#0C4CA1]" : "text-[#08357A]",
                  )}
                >
                  {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-[#2C4A73]">vs yesterday</span>
              </div>
            )}
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0C4CA1] text-white shadow-[0_10px_18px_-12px_rgba(12,76,161,0.9)] transition-transform duration-300 group-hover:scale-110">
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <ArrowUpRight className="absolute top-4 right-4 h-3.5 w-3.5 text-[#0C4CA1]/20 group-hover:text-[#0C4CA1]/50 transition-colors" />
      </div>
    </motion.div>
  );
}
