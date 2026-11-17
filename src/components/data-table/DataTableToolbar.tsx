import type { ReactNode } from "react";
import { ClipboardList, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DataTableSearchProps } from "./types";

interface DataTableToolbarProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  count?: number;
  search?: DataTableSearchProps;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function DataTableToolbar({
  title,
  description,
  icon,
  count,
  search,
  filters,
  actions,
}: DataTableToolbarProps) {
  return (
    <div className="flex shrink-0 flex-col gap-4 border-b border-[#E3EAF3] px-4 py-4 dark:border-[#2C3B50] sm:flex-row sm:items-start sm:justify-between sm:px-5">
      {title ? (
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
          {icon ?? <ClipboardList className="h-4 w-4" aria-hidden />}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{title}</h3>
            {typeof count === "number" && (
              <span className="rounded-full bg-[#EAF2FC] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                {count}
              </span>
            )}
          </div>
          {description ? (
            <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#A9B8CC]">{description}</p>
          ) : null}
        </div>
      </div>
      ) : <div />}

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        {filters}
        {search ? (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden />
            <Input
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={search.placeholder ?? "Search..."}
              className={cn(
                "h-9 rounded-lg border-[#E3EAF3] bg-white pl-9 pr-8 text-sm shadow-none",
                "focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 focus-visible:ring-offset-0",
                "dark:border-[#2C3B50] dark:bg-[#151F30]",
              )}
              aria-label={search.placeholder ?? "Search"}
            />
            {search.value ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#94A3B8] hover:text-[#172B4D] dark:hover:text-[#F1F5F9]"
                onClick={() => search.onChange("")}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
