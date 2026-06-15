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

/** Balanced header themes — visible sky/teal gradients, not washed out */
const THEMES: Record<
  PageHeaderVariant,
  { shell: string; icon: string; eyebrow: string; subtitle: string }
> = {
  sky: {
    shell: "from-brand-from via-[#0088c4] to-brand-to border-brand-from/40 shadow-md shadow-brand-from/20",
    icon: "bg-white/20 text-white ring-white/30",
    eyebrow: "text-white/90",
    subtitle: "text-white/90",
  },
  blue: {
    shell: "from-blue-500 via-blue-600 to-indigo-600 border-blue-400/40 shadow-md shadow-blue-500/20",
    icon: "bg-white/20 text-white ring-white/30",
    eyebrow: "text-blue-100/90",
    subtitle: "text-blue-50/90",
  },
  indigo: {
    shell: "from-indigo-500 via-indigo-600 to-violet-600 border-indigo-400/40 shadow-md shadow-indigo-500/20",
    icon: "bg-white/20 text-white ring-white/30",
    eyebrow: "text-indigo-100/90",
    subtitle: "text-indigo-50/90",
  },
  violet: {
    shell: "from-violet-500 via-purple-600 to-indigo-600 border-violet-400/40 shadow-md shadow-violet-500/20",
    icon: "bg-white/20 text-white ring-white/30",
    eyebrow: "text-violet-100/90",
    subtitle: "text-violet-50/90",
  },
  emerald: {
    shell: "from-emerald-500 via-emerald-600 to-teal-600 border-emerald-400/40 shadow-md shadow-emerald-500/20",
    icon: "bg-white/20 text-white ring-white/30",
    eyebrow: "text-emerald-100/90",
    subtitle: "text-emerald-50/90",
  },
  teal: {
    shell: "from-teal-500 via-teal-600 to-cyan-600 border-teal-400/40 shadow-md shadow-teal-500/20",
    icon: "bg-white/20 text-white ring-white/30",
    eyebrow: "text-teal-100/90",
    subtitle: "text-teal-50/90",
  },
  cyan: {
    shell: "from-cyan-500 via-cyan-600 to-blue-600 border-cyan-400/40 shadow-md shadow-cyan-500/20",
    icon: "bg-white/20 text-white ring-white/30",
    eyebrow: "text-cyan-100/90",
    subtitle: "text-cyan-50/90",
  },
  orange: {
    shell: "from-orange-500 via-orange-600 to-amber-600 border-orange-400/40 shadow-md shadow-orange-500/20",
    icon: "bg-white/20 text-white ring-white/30",
    eyebrow: "text-orange-100/90",
    subtitle: "text-orange-50/90",
  },
  amber: {
    shell: "from-amber-500 via-amber-600 to-orange-600 border-amber-400/40 shadow-md shadow-amber-500/20",
    icon: "bg-white/20 text-white ring-white/30",
    eyebrow: "text-amber-100/90",
    subtitle: "text-amber-50/90",
  },
  rose: {
    shell: "from-rose-500 via-rose-600 to-pink-600 border-rose-400/40 shadow-md shadow-rose-500/20",
    icon: "bg-white/20 text-white ring-white/30",
    eyebrow: "text-rose-100/90",
    subtitle: "text-rose-50/90",
  },
  slate: {
    shell: "from-slate-500 via-slate-600 to-gray-700 border-slate-400/40 shadow-md shadow-slate-500/20",
    icon: "bg-white/20 text-white ring-white/30",
    eyebrow: "text-slate-100/90",
    subtitle: "text-slate-50/90",
  },
  fuchsia: {
    shell: "from-fuchsia-500 via-fuchsia-600 to-purple-600 border-fuchsia-400/40 shadow-md shadow-fuchsia-500/20",
    icon: "bg-white/20 text-white ring-white/30",
    eyebrow: "text-fuchsia-100/90",
    subtitle: "text-fuchsia-50/90",
  },
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
  variant = "sky",
  actions,
  footer,
  eyebrow,
  className,
}: PageHeaderProps) {
  const theme = THEMES[variant];

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
