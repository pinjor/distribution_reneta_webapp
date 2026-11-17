import type { ReactNode } from "react";
import { Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DataTableRowActionsProps {
  onView?: () => void;
  onPrint?: () => void;
  viewLabel?: string;
  printLabel?: string;
  extra?: ReactNode;
  className?: string;
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-md px-2 text-[#475569] hover:bg-[#EAF2FC] hover:text-[#0C4DA1] dark:text-[#A9B8CC] dark:hover:bg-[#1B304D] dark:hover:text-[#70ADFF]"
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function DataTableRowActions({
  onView,
  onPrint,
  viewLabel = "View",
  printLabel = "Print",
  extra,
  className,
}: DataTableRowActionsProps) {
  return (
    <div className={cn("flex items-center justify-end gap-0.5", className)}>
      <ActionButton label={viewLabel} onClick={onView}>
        <Eye className="h-4 w-4" />
        <span className="hidden text-xs font-medium sm:inline">{viewLabel}</span>
      </ActionButton>
      <ActionButton label={printLabel} onClick={onPrint}>
        <Printer className="h-4 w-4" />
      </ActionButton>
      {extra}
    </div>
  );
}
