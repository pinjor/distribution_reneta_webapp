import { Card } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export interface ExpiryAlertRow {
  product: string;
  batch: string;
  expiry?: string | null;
  days: number;
  severity: "error" | "warning" | "info";
}

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

interface ExpiryAlertsProps {
  data?: ExpiryAlertRow[];
  isLoading?: boolean;
  isError?: boolean;
}

export function ExpiryAlerts({ data = [], isLoading = false, isError = false }: ExpiryAlertsProps) {
  const navigate = useNavigate();

  return (
    <Card className="border border-[#D5E1F2] bg-white p-6 shadow-[0_16px_40px_-28px_rgba(12,76,161,0.45)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Expiry Alerts</h3>
          <p className="text-xs text-muted-foreground">Batches expiring within 60 days</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-[#0C4CA1] hover:bg-[#E7EEF8] hover:text-[#08357A]"
          onClick={() => navigate("/warehouse/maintenance")}
        >
          View stock
        </Button>
      </div>
      {isError ? (
        <p className="text-sm text-destructive">Could not load expiry alerts.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No batches nearing expiry in the current depot scope.</p>
      ) : (
        <div className="space-y-2">
          {data.map((item, index) => {
            const cfg = SEVERITY[item.severity] || SEVERITY.info;
            const Icon = cfg.icon;
            return (
              <div
                key={`${item.batch}-${index}`}
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
      )}
    </Card>
  );
}
