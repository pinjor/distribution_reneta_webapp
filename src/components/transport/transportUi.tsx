import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAVY_TEAL_SCOPE_CLASS } from "@/lib/navyTealTheme";
import { cn } from "@/lib/utils";

export const fieldClass =
  "h-10 rounded-lg border border-[#CBD5E1] bg-white text-[13px] shadow-none focus:ring-0 focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]";
export const labelClass = "text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]";
export const selectPanelClass = "nt-select-panel z-[200] rounded-xl border p-1 shadow-lg";
export const selectItemClass = "cursor-pointer rounded-md py-2 pl-8 pr-3 text-[13px] leading-snug";
export const fieldWrapClass = "min-w-0 space-y-1";
export const requiredMark = <span className="text-[#DC2626]">*</span>;

export const dialogContentClass = cn(
  NAVY_TEAL_SCOPE_CLASS,
  "flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[720px] flex-col gap-0 overflow-hidden rounded-[20px] border border-[#E3EAF3] bg-white p-0 shadow-[0_24px_48px_rgba(15,23,42,0.16)] dark:border-[#2C3B50] dark:bg-[#151F30]",
);

export function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

export function ActionIconButton({
  label,
  onClick,
  className,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
          className={cn("h-8 w-8 rounded-md p-0", className)}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function StatusPill({ value, active }: { value: string; active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
        active
          ? "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]"
          : "bg-[#F1F5F9] text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]",
      )}
    >
      {value || "—"}
    </span>
  );
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  accent,
  description,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "blue" | "green" | "purple";
  description?: string;
}) {
  const accentClass =
    accent === "green"
      ? "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]"
      : accent === "purple"
        ? "bg-[#F3E8FF] text-[#7C3AED] dark:bg-[#2E1064] dark:text-[#C4B5FD]"
        : "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]";

  return (
    <div className="rounded-xl border border-[#E3EAF3] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:border-[#2C3B50] dark:bg-[#151F30]">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", accentClass)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#64748B] dark:text-[#A9B8CC]">{title}</p>
          <p className="text-xl font-semibold tabular-nums tracking-tight text-[#172B4D] dark:text-[#F1F5F9]">{value}</p>
          {description ? <p className="text-[11px] text-[#64748B] dark:text-[#A9B8CC]">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}

export const sectionMotion = (reduceMotion: boolean | null) => ({
  initial: reduceMotion ? false : { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: reduceMotion ? 0 : 0.16 },
});
