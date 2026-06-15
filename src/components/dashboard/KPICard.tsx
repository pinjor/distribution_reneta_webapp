import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  accent?: "blue" | "emerald" | "indigo" | "violet" | "amber" | "rose" | "cyan";
}

export function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  description,
}: KPICardProps) {
  return (
    <Card className="p-5 border-2 transition-shadow hover:shadow-md card-tile">
      <div className="flex items-start justify-between gap-3">
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
        <div className={cn("h-12 w-12 shrink-0 rounded-xl flex items-center justify-center", brandIconBoxClasses)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}
