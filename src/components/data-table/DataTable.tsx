import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DataTableEmptyState } from "./DataTableEmptyState";
import { DataTableLoading } from "./DataTableLoading";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableToolbar } from "./DataTableToolbar";
import { paginate } from "./paginate";
import type { DataTableColumn, DataTableSearchProps, SortOrder } from "./types";

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  sortKey?: keyof T | null;
  sortOrder?: SortOrder;
  onSort?: (key: keyof T) => void;
  emptyMessage?: string;
  error?: string;
  loading?: boolean;
  getRowId?: (row: T, index: number) => string | number;
  title?: string;
  description?: string;
  toolbarIcon?: ReactNode;
  search?: DataTableSearchProps;
  toolbarFilters?: ReactNode;
  toolbarActions?: ReactNode;
  pageSizeOptions?: number[];
  initialPageSize?: number;
  resetPageKey?: string | number;
  className?: string;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string;
}

export function DataTable<T>({
  data,
  columns,
  sortKey,
  sortOrder,
  onSort,
  emptyMessage = "No data available",
  error,
  loading = false,
  getRowId,
  title,
  description,
  toolbarIcon,
  search,
  toolbarFilters,
  toolbarActions,
  pageSizeOptions = [10, 20, 50, 100],
  initialPageSize = 10,
  resetPageKey,
  className,
  onRowClick,
  getRowClassName,
}: DataTableProps<T>) {
  const reduceMotion = useReducedMotion();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    setPage(1);
  }, [resetPageKey, pageSize]);

  const paged = paginate(data, page, pageSize);

  useEffect(() => {
    if (page !== paged.page) {
      setPage(paged.page);
    }
  }, [page, paged.page]);

  const alignClass = (align?: "left" | "center" | "right") =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  const ariaSort = (columnKey: keyof T): "none" | "ascending" | "descending" => {
    if (sortKey !== columnKey) return "none";
    return sortOrder === "desc" ? "descending" : "ascending";
  };

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#E3EAF3] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#2C3B50] dark:bg-[#151F30]",
        className,
      )}
    >
      {title || search || toolbarFilters || toolbarActions ? (
        <DataTableToolbar
          title={title}
          description={description}
          icon={toolbarIcon}
          count={title ? data.length : undefined}
          search={search}
          filters={toolbarFilters}
          actions={toolbarActions}
        />
      ) : null}

      <motion.div
        className={cn("nt-page-scroll min-h-0 flex-1 overflow-x-auto", loading ? "overflow-y-hidden" : "overflow-y-auto")}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.16 }}
      >
        <table className="w-full min-w-[720px] caption-bottom text-sm">
          <thead className="sticky top-0 z-10 bg-[#F8FAFC] dark:bg-[#1B283B]">
            <tr className="border-b border-[#E3EAF3] dark:border-[#2C3B50]">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  aria-sort={column.sortable ? ariaSort(column.key) : undefined}
                  className={cn(
                    "h-11 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-wide text-[#64748B] dark:text-[#A9B8CC]",
                    alignClass(column.align),
                    column.headerClassName,
                  )}
                >
                  {column.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md transition-colors duration-150 hover:text-[#0C4DA1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/30",
                        column.align === "right" && "w-full justify-end",
                        sortKey === column.key && "text-[#0C4DA1] dark:text-[#70ADFF]",
                      )}
                    >
                      {column.label}
                      <span className="text-[#94A3B8] transition-transform duration-150">
                        {sortKey !== column.key ? (
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        ) : sortOrder === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )}
                      </span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <DataTableLoading columns={columns.length} />
            ) : error ? (
              <DataTableEmptyState message={error} colSpan={columns.length} />
            ) : paged.rows.length === 0 ? (
              <DataTableEmptyState message={emptyMessage} colSpan={columns.length} />
            ) : (
              paged.rows.map((row, index) => (
                <tr
                  key={getRowId ? String(getRowId(row, index)) : index}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "border-b border-[#E3EAF3] transition-colors duration-150 last:border-0 hover:bg-[#F4F8FD] dark:border-[#2C3B50] dark:hover:bg-[#1B304D]/50",
                    onRowClick && "cursor-pointer",
                    getRowClassName?.(row),
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        "px-4 py-3 align-middle text-[13px] text-[#172B4D] dark:text-[#F1F5F9]",
                        alignClass(column.align),
                        column.className,
                      )}
                    >
                      {column.render ? column.render(row[column.key], row) : String(row[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>

      <DataTablePagination
        page={paged.page}
        pageCount={paged.pageCount}
        pageSize={pageSize}
        total={paged.total}
        start={paged.start}
        end={paged.end}
        pageSizeOptions={pageSizeOptions}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
