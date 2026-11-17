import { cn } from "@/lib/utils";

function isInTransitStatus(status: string) {
  return status === "InTransit" || status === "In Transit";
}

export function DeliveryStatusBadge({
  status,
  label,
  className,
  size = "sm",
}: {
  status: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const inTransit = isInTransitStatus(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold",
        size === "md" ? "gap-1.5 px-2.5 py-1 text-[11px]" : "gap-1.5 px-2 py-0.5 text-[11px]",
        inTransit && "nt-status-in-transit",
        className,
      )}
    >
      {inTransit ? (
        <span className="nt-status-in-transit__track" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      ) : null}
      {label || status || "—"}
    </span>
  );
}
