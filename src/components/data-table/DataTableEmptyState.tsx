import { Inbox } from "lucide-react";

interface DataTableEmptyStateProps {
  message?: string;
  colSpan: number;
}

export function DataTableEmptyState({
  message = "No data available",
  colSpan,
}: DataTableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
            <Inbox className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm font-medium text-[#172B4D] dark:text-[#F1F5F9]">{message}</p>
        </div>
      </td>
    </tr>
  );
}
