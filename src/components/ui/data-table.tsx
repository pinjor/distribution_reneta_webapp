import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sortKey?: keyof T | null;
  sortOrder?: "asc" | "desc";
  onSort?: (key: keyof T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  sortKey,
  sortOrder,
  onSort,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const getSortIcon = (columnKey: keyof T) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="h-4 w-4" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  return (
    <div className="rounded-lg border bg-card animate-fade-in">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={String(column.key)}
                className={`${column.align === "right" ? "text-right" : ""} ${
                  column.align === "center" ? "text-center" : ""
                }`}
              >
                {column.sortable && onSort ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 hover:bg-accent"
                    onClick={() => onSort(column.key)}
                  >
                    {column.label}
                    {getSortIcon(column.key)}
                  </Button>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center text-muted-foreground py-8"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={index} className="hover:bg-accent/50 transition-colors">
                {columns.map((column) => (
                  <TableCell
                    key={String(column.key)}
                    className={`${column.align === "right" ? "text-right" : ""} ${
                      column.align === "center" ? "text-center" : ""
                    }`}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
