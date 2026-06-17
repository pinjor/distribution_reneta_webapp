import { LucideIcon, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { brandIconBoxClasses, brandLabelClasses, brandMutedClasses } from "@/lib/brandTheme";

interface NavTileCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
  index?: number;
  compact?: boolean;
}

export function NavTileCard({
  title,
  description,
  icon: Icon,
  onClick,
  className,
  index = 0,
  compact = false,
}: NavTileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.04, 0.4),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn("group h-full", className)}
    >
      <div
        className={cn(
          "nav-tile-card relative h-full cursor-pointer overflow-hidden rounded-2xl border-2 border-brand-from/20",
          "bg-gradient-to-br from-white via-brand-tile-from to-brand-tile-via",
          "shadow-[0_4px_20px_-4px_rgba(106,198,223,0.25)]",
          "transition-all duration-300 ease-out",
          "hover:border-brand-from/45 hover:shadow-[0_12px_32px_-8px_rgba(106,198,223,0.45)]",
          "focus-within:ring-2 focus-within:ring-brand-from/30 focus-within:ring-offset-2",
        )}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-from/15 blur-2xl transition-all duration-500 group-hover:bg-brand-from/30 group-hover:scale-125" />
        <div className="pointer-events-none absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-brand-to/10 blur-xl transition-opacity duration-500 group-hover:opacity-100 opacity-60" />

        {/* Shine sweep on hover */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12" />
        </div>

        <div
          className={cn(
            "relative z-[1] p-5",
            compact ? "flex flex-col items-center text-center gap-3" : "flex items-start gap-4",
          )}
        >
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl transition-all duration-300",
              "group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg group-hover:shadow-brand-from/30",
              compact ? "h-12 w-12" : "h-11 w-11 p-0",
              brandIconBoxClasses,
            )}
          >
            <Icon className={cn(compact ? "h-5 w-5" : "h-5 w-5")} strokeWidth={2.25} />
          </div>

          <div className={cn("min-w-0 flex-1", compact && "w-full")}>
            <div className="flex items-start justify-between gap-2">
              <h3
                className={cn(
                  "font-semibold leading-snug transition-colors duration-300 group-hover:text-brand-deep",
                  brandLabelClasses,
                  compact ? "text-sm" : "text-base",
                )}
              >
                {title}
              </h3>
              {!compact && (
                <ArrowUpRight
                  className={cn(
                    "h-4 w-4 shrink-0 mt-0.5 text-brand-from/30",
                    "transition-all duration-300 group-hover:text-brand-from group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                  )}
                />
              )}
            </div>
            {description && (
              <p
                className={cn(
                  "mt-1.5 line-clamp-2 leading-relaxed transition-colors duration-300",
                  brandMutedClasses,
                  compact ? "text-xs" : "text-sm",
                )}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-from via-brand-to to-brand-deep scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      </div>
    </motion.div>
  );
}

interface StatTileCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  index?: number;
}

export function StatTileCard({
  label,
  value,
  icon: Icon,
  onClick,
  active,
  className,
  index = 0,
}: StatTileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className={cn("group h-full", className)}
    >
      <div
        className={cn(
          "nav-tile-card relative h-full overflow-hidden rounded-2xl border-2 p-4",
          "bg-gradient-to-br from-white via-brand-tile-from to-brand-tile-via",
          "border-brand-from/20 shadow-[0_4px_16px_-4px_rgba(106,198,223,0.2)]",
          "transition-all duration-300 hover:border-brand-from/40 hover:shadow-[0_8px_24px_-6px_rgba(106,198,223,0.35)]",
          onClick && "cursor-pointer",
          active && "ring-2 ring-brand-from border-brand-from/50 shadow-md",
        )}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
        <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-brand-from/10 blur-xl group-hover:bg-brand-from/20 transition-colors" />
        <div className="relative z-[1] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("text-sm font-medium", brandMutedClasses)}>{label}</p>
            <p className={cn("text-2xl font-bold tabular-nums mt-1", brandLabelClasses)}>{value}</p>
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110", brandIconBoxClasses)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
