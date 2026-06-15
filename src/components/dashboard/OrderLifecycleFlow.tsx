import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { shineHoverSoftClasses, shineHoverClasses } from "@/components/ui/shine-hover";
import { cn } from "@/lib/utils";

export interface LifecycleStep {
  id: number;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  path: string;
  gradient: string;
  ring: string;
}

interface OrderLifecycleFlowProps {
  steps: LifecycleStep[];
  className?: string;
}

export function OrderLifecycleFlow({ steps, className }: OrderLifecycleFlowProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("relative", className)}>
      <div className="hidden lg:block absolute top-10 left-[6%] right-[6%] h-1 bg-gradient-to-r from-blue-400 via-violet-400 to-emerald-400 rounded-full opacity-40" />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => navigate(step.path)}
            className={cn(
              "group flex flex-col items-center text-center rounded-xl p-3 transition-all hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              shineHoverSoftClasses,
            )}
          >
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md ring-4 transition-transform group-hover:scale-105",
                shineHoverClasses,
                step.gradient,
                step.ring,
              )}
            >
              <step.icon className="h-6 w-6" />
            </div>
            <span className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Step {step.id}
            </span>
            <span className="mt-0.5 text-xs font-semibold leading-tight text-foreground">
              {step.title}
            </span>
            <span className="mt-1 text-[10px] text-muted-foreground leading-snug hidden sm:block">
              {step.subtitle}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
