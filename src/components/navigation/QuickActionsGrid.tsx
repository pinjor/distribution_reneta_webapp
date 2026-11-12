import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { brandLabelClasses, brandMutedClasses } from "@/lib/brandTheme";

export interface QuickActionItem {
  title: string;
  icon: LucideIcon;
  path: string;
  description?: string;
}

interface QuickActionsGridProps {
  actions: QuickActionItem[];
  onNavigate: (path: string) => void;
  className?: string;
}

/**
 * Compact operational Quick Actions grid for Dashboard.
 * Preserves action order, labels, and onNavigate destinations.
 */
export function QuickActionsGrid({ actions, onNavigate, className }: QuickActionsGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        "grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        const description = action.description ?? `Go to ${action.title}`;

        return (
          <button
            key={action.path}
            type="button"
            onClick={() => onNavigate(action.path)}
            className={cn(
              "group relative flex w-full items-start gap-3 rounded-[11px] border border-border bg-card p-3.5 text-left",
              "shadow-sm transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out",
              "hover:border-nt-accent/45 hover:bg-nt-muted/40 hover:shadow-md",
              "active:scale-[0.99] active:bg-nt-muted/60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nt-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "motion-reduce:transition-none motion-reduce:active:scale-100",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                "bg-nt-accent/10 text-nt-accent",
                "transition-colors duration-150 group-hover:bg-nt-accent/15",
                "motion-reduce:transition-none",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </div>

            <div className="min-w-0 flex-1 pr-5">
              <p className={cn("text-sm font-semibold leading-snug", brandLabelClasses)}>
                {action.title}
              </p>
              <p className={cn("mt-0.5 text-xs leading-snug", brandMutedClasses)}>
                {description}
              </p>
            </div>

            <ArrowUpRight
              className={cn(
                "absolute right-3 top-3.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50",
                "transition-transform duration-150 ease-out",
                "group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-nt-accent",
                "motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0",
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

export function QuickActionsHeading({ className }: { className?: string }) {
  return (
    <div className={cn("mb-3", className)}>
      <h2 className={cn("text-lg font-semibold leading-tight", brandLabelClasses)}>
        Quick Actions
      </h2>
      <p className={cn("mt-0.5 text-xs", brandMutedClasses)}>
        Access frequently used warehouse operations
      </p>
    </div>
  );
}
