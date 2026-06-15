import { Card } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const expiryData = [
  { product: "Paracetamol 500mg", batch: "PCM2024-11", expiry: "2025-01-15", days: 7, severity: "error" as const },
  { product: "Amoxicillin 250mg", batch: "AMX2024-08", expiry: "2025-01-20", days: 12, severity: "warning" as const },
  { product: "Ibuprofen 400mg", batch: "IBU2024-09", expiry: "2025-01-25", days: 17, severity: "warning" as const },
  { product: "Vitamin C 1000mg", batch: "VTC2024-12", expiry: "2025-02-01", days: 24, severity: "info" as const },
];

const SEVERITY = {
  error: {
    icon: AlertCircle,
    border: "border-rose-200 dark:border-rose-900/50",
    bg: "bg-rose-50/80 dark:bg-rose-950/30",
    iconColor: "text-rose-600",
    badge: "text-rose-700 bg-rose-100 dark:bg-rose-900/50",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-200 dark:border-amber-900/50",
    bg: "bg-amber-50/80 dark:bg-amber-950/30",
    iconColor: "text-amber-600",
    badge: "text-amber-700 bg-amber-100 dark:bg-amber-900/50",
  },
  info: {
    icon: Info,
    border: "border-blue-200 dark:border-blue-900/50",
    bg: "bg-blue-50/80 dark:bg-blue-950/30",
    iconColor: "text-blue-600",
    badge: "text-blue-700 bg-blue-100 dark:bg-blue-900/50",
  },
};

export function ExpiryAlerts() {
  return (
    <Card className="p-6 card-elevated border-2 border-amber-100 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/40 to-card dark:from-amber-950/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Expiry Alerts</h3>
          <p className="text-xs text-muted-foreground">Products nearing expiry</p>
        </div>
        <Button variant="ghost" size="sm" className="text-amber-700 hover:text-amber-800 hover:bg-amber-100">
          View All
        </Button>
      </div>
      <div className="space-y-2">
        {expiryData.map((item, index) => {
          const cfg = SEVERITY[item.severity];
          const Icon = cfg.icon;
          return (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors hover:shadow-sm",
                cfg.border,
                cfg.bg,
              )}
            >
              <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", cfg.iconColor)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product}</p>
                <p className="text-xs text-muted-foreground">Batch: {item.batch}</p>
              </div>
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full shrink-0", cfg.badge)}>
                {item.days}d
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
