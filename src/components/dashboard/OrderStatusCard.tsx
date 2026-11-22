import {
  Clock,
  FileCheck,
  Truck,
  CheckCircle2,
  Package,
  PauseCircle,
  Coins,
  LucideIcon,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { shineHoverSoftClasses } from "@/components/ui/shine-hover";

interface OrderStatusCardProps {
  status: string;
  count: number;
  onClick: () => void;
}

const STATUS_META: Record<
  string,
  { icon: LucideIcon; label: string; hint: string }
> = {
  "Pending Validation": {
    icon: Clock,
    label: "Pending Validation",
    hint: "Awaiting approval",
  },
  Validated: {
    icon: FileCheck,
    label: "Validated",
    hint: "Ready for routing",
  },
  Assigned: {
    icon: Truck,
    label: "Assigned",
    hint: "Loaded & dispatched",
  },
  "Fully Delivered": {
    icon: CheckCircle2,
    label: "Fully Delivered",
    hint: "Completed delivery",
  },
  "Partial Delivered": {
    icon: Package,
    label: "Partial Delivered",
    hint: "Partial completion",
  },
  Postponed: {
    icon: PauseCircle,
    label: "Postponed",
    hint: "Rescheduled visits",
  },
  "Pending Collection": {
    icon: Coins,
    label: "Pending Collection",
    hint: "Cash not collected",
  },
};

export function OrderStatusCard({ status, count, onClick }: OrderStatusCardProps) {
  const meta = STATUS_META[status] ?? {
    icon: Clock,
    label: status,
    hint: "Orders in this stage",
  };
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col rounded-2xl border border-[#D5E1F2] bg-white p-4 text-left shadow-[0_10px_24px_-18px_rgba(12,76,161,0.6)]",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:border-[#0C4CA1] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4CA1]/40 focus-visible:ring-offset-2",
        shineHoverSoftClasses,
      )}
    >
      <div className="relative z-[1] flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0C4CA1] text-white transition-transform duration-300 group-hover:scale-105">
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#0C4CA1]/40 transition-all duration-300 group-hover:text-[#0C4CA1] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>

      <div className="relative z-[1] mt-3 min-h-[2.5rem]">
        <p className="text-[11px] font-semibold leading-snug tracking-wide text-[#0B1B33]">
          {meta.label}
        </p>
        <p className="mt-0.5 text-[10px] leading-tight text-[#2C4A73]">{meta.hint}</p>
      </div>

      <div className="relative z-[1] mt-3 border-t border-[#D5E1F2] pt-3">
        <p className="text-3xl font-semibold tabular-nums leading-none tracking-tight text-[#0C4CA1]">
          {count.toLocaleString()}
        </p>
        <p className="mt-1.5 text-[10px] font-medium text-[#2C4A73]">
          orders in stage
        </p>
      </div>
    </button>
  );
}
