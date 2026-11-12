import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const VARIANT_ICON = {
  default: {
    Icon: CheckCircle2,
    wrap: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  success: {
    Icon: CheckCircle2,
    wrap: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  warning: {
    Icon: AlertTriangle,
    wrap: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  },
  info: {
    Icon: Info,
    wrap: "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
  },
  destructive: {
    Icon: AlertCircle,
    wrap: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
  },
} as const;

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const visual = VARIANT_ICON[variant ?? "default"] ?? VARIANT_ICON.default;
        const Icon = visual.Icon;

        return (
          <Toast key={id} variant={variant} {...props}>
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                visual.wrap,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="grid min-w-0 flex-1 gap-0.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
