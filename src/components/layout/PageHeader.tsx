import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PageHeaderVariant =
  | "sky"
  | "violet"
  | "blue"
  | "indigo"
  | "emerald"
  | "teal"
  | "cyan"
  | "orange"
  | "amber"
  | "rose"
  | "slate"
  | "fuchsia";

/** Single brand theme — all page titles use the same cyan palette */
const BRAND_THEME = {
  shell: "from-brand-from via-brand-to to-brand-deep border-brand-from/40 shadow-md shadow-brand-from/20",
  icon: "bg-white/20 text-white ring-white/30",
  eyebrow: "text-white/90",
  subtitle: "text-white/90",
};

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: PageHeaderVariant;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  eyebrow?: string;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  footer,
  eyebrow,
  className,
}: PageHeaderProps) {
  const theme = BRAND_THEME;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 bg-gradient-to-r p-5 sm:p-6",
        theme.shell,
        className,
      )}
    >
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNhwySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30 pointer-events-none" />
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start gap-4 min-w-0 text-white">
          <div
            className={cn(
              "flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl backdrop-blur-sm shadow-lg ring-2",
              theme.icon,
            )}
          >
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className={cn("text-[11px] font-semibold uppercase tracking-widest mb-0.5", theme.eyebrow)}>
                {eyebrow}
              </p>
            )}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-words text-white">
              {title}
            </h1>
            {subtitle && (
              <p className={cn("mt-1 text-sm max-w-2xl leading-relaxed", theme.subtitle)}>{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 text-foreground",
              "[&_input]:bg-white [&_input]:text-foreground [&_input]:placeholder:text-muted-foreground [&_input]:border-white/50",
              "[&_button[role=combobox]]:bg-white [&_button[role=combobox]]:text-foreground [&_button[role=combobox]]:border-white/50",
              "[&_button:not([class*='bg-gradient'])]:shadow-sm",
            )}
          >
            {actions}
          </div>
        )}
        {footer && (
          <div className="pt-1 border-t border-white/20">{footer}</div>
        )}
      </div>
    </div>
  );
}
