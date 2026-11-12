import { Card } from "@/components/ui/card";
import { CalendarClock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { brandLabelClasses, brandMutedClasses } from "@/lib/brandTheme";

const expiryData = [
  { product: "Paracetamol 500mg", batch: "PCM2024-11", expiry: "2025-01-15", days: 7, severity: "error" as const },
  { product: "Amoxicillin 250mg", batch: "AMX2024-08", expiry: "2025-01-20", days: 12, severity: "warning" as const },
  { product: "Ibuprofen 400mg", batch: "IBU2024-09", expiry: "2025-01-25", days: 17, severity: "warning" as const },
  { product: "Vitamin C 1000mg", batch: "VTC2024-12", expiry: "2025-02-01", days: 24, severity: "info" as const },
];

const SEVERITY = {
  error: {
    label: "Critical",
    badge:
      "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-200 dark:bg-rose-950/40 dark:border-rose-900/50",
  },
  warning: {
    label: "Warning",
    badge:
      "text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50",
  },
  info: {
    label: "Info",
    badge:
      "text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-200 dark:bg-slate-900/40 dark:border-slate-700",
  },
};

export function ExpiryAlerts() {
  return (
    <Card className="h-auto overflow-hidden border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-nt-accent/10 text-nt-accent">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className={cn("text-[15px] font-semibold leading-tight", brandLabelClasses)}>
              Expiry Alerts
            </h3>
            <p className={cn("mt-0.5 text-xs leading-tight", brandMutedClasses)}>
              Products nearing expiry
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 shrink-0 px-2 text-xs font-medium",
            brandLabelClasses,
            "hover:bg-nt-muted/60",
          )}
        >
          View All
        </Button>
      </div>

      {expiryData.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" aria-hidden />
          <span>No products nearing expiry</span>
        </div>
      ) : (
        <ul className="h-auto divide-y divide-border" role="list">
          {/* Desktop column hint — visually subtle, sr-friendly structure */}
          <li
            className="hidden grid-cols-[minmax(0,1fr)_7.5rem_4.5rem] gap-3 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid"
            aria-hidden
          >
            <span>Product / Batch</span>
            <span className="text-center">Urgency</span>
            <span className="text-right">Remaining</span>
          </li>

          {expiryData.map((item, index) => {
            const cfg = SEVERITY[item.severity];
            return (
              <li
                key={`${item.batch}-${index}`}
                className={cn(
                  "grid grid-cols-1 gap-1.5 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_7.5rem_4.5rem] sm:items-center sm:gap-3",
                  "transition-colors duration-150 ease-out",
                  "hover:bg-nt-muted/35",
                  "focus-within:bg-nt-muted/35",
                  "motion-reduce:transition-none",
                )}
              >
                <div className="min-w-0">
                  <p className={cn("text-sm font-semibold leading-snug break-words", brandLabelClasses)}>
                    {item.product}
                  </p>
                  <p className={cn("mt-0.5 text-xs leading-snug break-all", brandMutedClasses)}>
                    Batch: {item.batch}
                  </p>
                </div>

                <div className="flex sm:justify-center">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none",
                      cfg.badge,
                    )}
                  >
                    {cfg.label}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 sm:justify-end">
                  <span
                    className={cn(
                      "text-sm font-medium tabular-nums leading-none",
                      brandLabelClasses,
                    )}
                    title={`${item.days} days remaining`}
                  >
                    {item.days}d
                  </span>
                  <span className="text-[10px] text-muted-foreground sm:hidden">remaining</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
