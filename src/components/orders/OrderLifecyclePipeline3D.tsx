import { motion } from "framer-motion";
import { CheckCircle2, Clock4, MinusCircle, MoveRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LIFECYCLE_STEP_MAP,
  ORDER_LIFECYCLE_STEPS,
  OrderLifecycleKey,
  LifecycleStepStatus,
} from "@/lib/orderLifecycle";

export interface LifecycleTrackingStep {
  key: string;
  label: string;
  status: LifecycleStepStatus;
  timestamp?: string;
}

interface OrderLifecyclePipeline3DProps {
  steps: LifecycleTrackingStep[];
  className?: string;
}

const STATUS_META: Record<
  LifecycleStepStatus,
  { badge: string; ring: string; Icon: typeof CheckCircle2 }
> = {
  completed: {
    badge: "bg-emerald-500/15 text-emerald-700 border-emerald-400/40",
    ring: "border-emerald-400 shadow-[0_8px_32px_rgba(16,185,129,0.35)]",
    Icon: CheckCircle2,
  },
  current: {
    badge: "bg-brand-from/15 text-brand-deep border-brand-from/50",
    ring: "border-brand-from shadow-[0_12px_40px_rgba(0,150,214,0.45)]",
    Icon: MoveRight,
  },
  pending: {
    badge: "bg-muted text-muted-foreground border-border",
    ring: "border-border/60 shadow-sm",
    Icon: Clock4,
  },
  blocked: {
    badge: "bg-red-500/15 text-red-700 border-red-400/40",
    ring: "border-red-400 shadow-[0_8px_32px_rgba(239,68,68,0.3)]",
    Icon: MinusCircle,
  },
};

function formatTimestamp(ts?: string) {
  if (!ts) return "Awaiting";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function OrderLifecyclePipeline3D({ steps, className }: OrderLifecyclePipeline3DProps) {
  const merged = ORDER_LIFECYCLE_STEPS.map((def) => {
    const fromApi = steps.find((s) => s.key === def.key);
    return {
      ...def,
      status: (fromApi?.status ?? "pending") as LifecycleStepStatus,
      timestamp: fromApi?.timestamp,
    };
  });

  const completedCount = merged.filter((s) => s.status === "completed").length;
  const progressPct = Math.min(100, ((completedCount + 0.5) / merged.length) * 100);

  return (
    <div className={cn("relative", className)} style={{ perspective: "1200px" }}>
      {/* Desktop: icon row with line through vertical center */}
      <div className="relative hidden lg:grid lg:grid-cols-8 lg:gap-3">
        <div
          className="pointer-events-none absolute z-0 left-[6.25%] right-[6.25%] top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted overflow-hidden shadow-inner"
          aria-hidden
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-from via-brand-to to-brand-deep"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>

        {merged.map((step, index) => (
          <LifecycleIconNode
            key={`icon-${step.key}`}
            step={step}
            index={index}
            iconOnly
          />
        ))}
      </div>

      {/* Desktop: labels below icons */}
      <div className="hidden lg:grid lg:grid-cols-8 lg:gap-3 lg:mt-3">
        {merged.map((step) => (
          <LifecycleStepLabels key={`labels-${step.key}`} step={step} />
        ))}
      </div>

      {/* Mobile / tablet: stacked icon + labels per column */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:hidden">
        {merged.map((step, index) => (
          <div key={step.key} className="flex flex-col items-center text-center">
            <LifecycleIconNode step={step} index={index} iconOnly={false} />
            <LifecycleStepLabels step={step} />
          </div>
        ))}
      </div>
    </div>
  );
}

function LifecycleIconNode({
  step,
  index,
  iconOnly,
}: {
  step: (typeof ORDER_LIFECYCLE_STEPS)[number] & { status: LifecycleStepStatus; timestamp?: string };
  index: number;
  iconOnly: boolean;
}) {
  const meta = STATUS_META[step.status];
  const StatusIcon = meta.Icon;
  const Icon = step.icon;
  const isCurrent = step.status === "current";

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, rotateX: -18 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: index * 0.08, duration: 0.55, type: "spring", stiffness: 120 }}
      className={cn(
        "group flex flex-col items-center text-center",
        iconOnly && "relative z-10 h-20 justify-center",
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      <motion.div
        className="relative"
        whileHover={{ scale: 1.06, rotateY: 8, z: 20 }}
        animate={
          isCurrent
            ? { scale: [1, 1.05, 1], y: [0, -4, 0] }
            : {}
        }
        transition={
          isCurrent
            ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
            : { type: "spring", stiffness: 300 }
        }
      >
        {isCurrent && (
          <motion.span
            className="absolute inset-0 rounded-2xl bg-brand-from/25 blur-xl"
            animate={{ opacity: [0.4, 0.75, 0.4], scale: [0.9, 1.15, 0.9] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        <div
          className={cn(
            "relative flex h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20 items-center justify-center rounded-2xl border-[3px] bg-gradient-to-br text-white transition-transform",
            `bg-gradient-to-br ${step.gradient}`,
            meta.ring,
            step.ring,
            isCurrent && "ring-4",
          )}
          style={{
            transform: "translateZ(12px)",
            boxShadow: isCurrent
              ? "0 16px 40px rgba(0,150,214,0.4), inset 0 2px 4px rgba(255,255,255,0.35)"
              : "0 8px 24px rgba(0,0,0,0.12), inset 0 2px 4px rgba(255,255,255,0.25)",
          }}
        >
          <Icon className="h-7 w-7 sm:h-8 sm:w-8 drop-shadow-md" strokeWidth={2.25} />
          <span
            className={cn(
              "absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background shadow-md",
              step.status === "completed" && "text-emerald-600 border-emerald-300",
              step.status === "current" && "text-brand-from border-brand-from/40",
              step.status === "pending" && "text-muted-foreground border-border",
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" />
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LifecycleStepLabels({
  step,
}: {
  step: (typeof ORDER_LIFECYCLE_STEPS)[number] & { status: LifecycleStepStatus; timestamp?: string };
}) {
  const meta = STATUS_META[step.status];

  return (
    <div className="flex flex-col items-center text-center px-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-from/80">
        Step {step.id}
      </span>
      <span className="mt-0.5 text-xs sm:text-sm font-semibold leading-tight text-foreground">
        {step.title}
      </span>
      <span className="mt-1 text-[10px] text-muted-foreground leading-snug hidden sm:block">
        {step.subtitle}
      </span>
      <span
        className={cn(
          "mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          meta.badge,
        )}
      >
        {step.status === "completed"
          ? "Done"
          : step.status === "current"
            ? "Active"
            : step.status === "blocked"
              ? "Blocked"
              : "Pending"}
      </span>
      <p className="mt-1.5 text-[10px] text-muted-foreground/90 tabular-nums max-w-[9rem] leading-tight">
        {formatTimestamp(step.timestamp)}
      </p>
    </div>
  );
}

export function getCurrentLifecycleDef(steps: LifecycleTrackingStep[]) {
  const current = steps.find((s) => s.status === "current");
  if (current) {
    return LIFECYCLE_STEP_MAP[current.key as OrderLifecycleKey];
  }
  const lastCompleted = [...steps].reverse().find((s) => s.status === "completed");
  if (lastCompleted) {
    return LIFECYCLE_STEP_MAP[lastCompleted.key as OrderLifecycleKey];
  }
  return ORDER_LIFECYCLE_STEPS[0];
}
