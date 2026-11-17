import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPageNumbers } from "./paginate";

interface DataTablePaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  start: number;
  end: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function PageButton({
  label,
  disabled,
  active,
  onClick,
  ariaLabel,
}: {
  label: ReactNode;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      className={cn(
        "h-8 min-w-8 rounded-md border-[#E3EAF3] px-2 text-xs font-medium text-[#475569] shadow-none",
        "hover:bg-[#EAF2FC] hover:text-[#0C4DA1] disabled:opacity-40",
        "dark:border-[#2C3B50] dark:text-[#A9B8CC] dark:hover:bg-[#1B304D]",
        active && "border-[#0C4DA1] bg-[#0C4DA1] text-white hover:bg-[#0C4DA1] hover:text-white dark:border-[#70ADFF] dark:bg-[#70ADFF] dark:text-[#0B1220]",
      )}
    >
      {label}
    </Button>
  );
}

export function DataTablePagination({
  page,
  pageCount,
  pageSize,
  total,
  start,
  end,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const pages = getPageNumbers(page, pageCount);

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-[#E3EAF3] bg-white px-4 py-3 dark:border-[#2C3B50] dark:bg-[#151F30] sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-xs text-[#64748B] dark:text-[#A9B8CC]">
        {total === 0 ? "Showing 0 records" : `Showing ${start}–${end} of ${total} records`}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <label className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#A9B8CC]">
          Rows per page
          <select
            className="h-8 rounded-md border border-[#E3EAF3] bg-white px-2 text-xs text-[#172B4D] dark:border-[#2C3B50] dark:bg-[#151F30] dark:text-[#F1F5F9]"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <PageButton ariaLabel="First page" label={<ChevronsLeft className="h-3.5 w-3.5" />} disabled={page <= 1} onClick={() => onPageChange(1)} />
          <PageButton ariaLabel="Previous page" label={<ChevronLeft className="h-3.5 w-3.5" />} disabled={page <= 1} onClick={() => onPageChange(page - 1)} />
          {pages.map((item, index) =>
            item === "ellipsis" ? (
              <span key={`e-${index}`} className="px-1 text-xs text-[#94A3B8]">
                …
              </span>
            ) : (
              <PageButton
                key={item}
                label={item}
                active={item === page}
                ariaLabel={`Page ${item}`}
                onClick={() => onPageChange(item)}
              />
            ),
          )}
          <PageButton ariaLabel="Next page" label={<ChevronRight className="h-3.5 w-3.5" />} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} />
          <PageButton ariaLabel="Last page" label={<ChevronsRight className="h-3.5 w-3.5" />} disabled={page >= pageCount} onClick={() => onPageChange(pageCount)} />
        </div>
      </div>
    </div>
  );
}
