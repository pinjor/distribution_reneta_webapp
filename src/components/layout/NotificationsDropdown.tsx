import { Bell, CalendarClock, Package } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Existing navbar notification copy — presentation only, not a new data source. */
const NOTIFICATIONS = [
  {
    id: "expiry-alert",
    title: "Expiry Alert",
    description: "5 batches expiring in next 7 days",
    type: "expiry" as const,
  },
  {
    id: "low-stock-warning",
    title: "Low Stock Warning",
    description: "Product XYZ below minimum threshold",
    type: "stock" as const,
  },
];

const TYPE_STYLE = {
  expiry: {
    icon: CalendarClock,
    iconWrap: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300",
  },
  stock: {
    icon: Package,
    iconWrap: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
};

const easeOut = [0.22, 1, 0.36, 1] as const;

export function NotificationsDropdown() {
  const reduceMotion = useReducedMotion();
  const unreadCount = NOTIFICATIONS.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex h-10 w-10 items-center justify-center overflow-visible rounded-full",
            "bg-[#EAF2FC] text-[#0C4DA1]",
            "transition-colors duration-150",
            "hover:bg-[#d5e6fa]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/40 focus-visible:ring-offset-2",
            "dark:bg-[#1B304D] dark:text-[#70ADFF] dark:hover:bg-[#243a5c]",
            "motion-reduce:transition-none",
          )}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        >
          <motion.span
            className="inline-flex"
            whileHover={reduceMotion ? undefined : { rotate: 8 }}
            transition={{ duration: 0.18, ease: easeOut }}
          >
            <Bell className="h-5 w-5 fill-[#0C4DA1]/20 dark:fill-[#70ADFF]/25" strokeWidth={2.25} />
          </motion.span>
          {unreadCount > 0 ? (
            <motion.span
              key={unreadCount}
              initial={reduceMotion ? false : { scale: 0.85 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, ease: easeOut }}
              className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E11D48] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-[#0B1220]"
            >
              {unreadCount}
            </motion.span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className={cn(
          "w-[min(380px,calc(100vw-24px))] max-h-[min(480px,70vh)] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-0 text-[#1E293B] shadow-lg",
          "dark:border-[#2C3B50] dark:bg-[#151F30] dark:text-[#F1F5F9]",
          "data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100",
        )}
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.18, ease: easeOut }
          }
          style={{ transformOrigin: "top right" }}
        >
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
            <h2 className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
              Notifications
            </h2>
            {unreadCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EAF2FC] px-1.5 text-[11px] font-semibold text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                {unreadCount}
              </span>
            ) : null}
          </div>
          <DropdownMenuSeparator className="mx-0 my-0 bg-[#E2E8F0] dark:bg-[#2C3B50]" />

          {NOTIFICATIONS.length === 0 ? (
            <div className="flex items-center gap-2 px-3.5 py-6 text-sm text-[#64748B] dark:text-[#A9B8CC]">
              <Bell className="h-4 w-4 shrink-0" aria-hidden />
              <span>No notifications</span>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto py-1">
              {NOTIFICATIONS.map((item, index) => {
                const style = TYPE_STYLE[item.type];
                const Icon = style.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : {
                            duration: 0.18,
                            delay: Math.min(index, 8) * 0.03,
                            ease: easeOut,
                          }
                    }
                  >
                    <DropdownMenuItem
                      className={cn(
                        "cursor-default items-start gap-2.5 rounded-none px-3.5 py-3",
                        "text-[#1E293B] dark:text-[#F1F5F9]",
                        "transition-colors duration-150",
                        "focus:bg-[#EAF2FC] focus:text-[#1E293B]",
                        "data-[highlighted]:bg-[#EAF2FC] data-[highlighted]:text-[#1E293B]",
                        "dark:focus:bg-[#1B304D] dark:focus:text-[#F1F5F9]",
                        "dark:data-[highlighted]:bg-[#1B304D] dark:data-[highlighted]:text-[#F1F5F9]",
                        "motion-reduce:transition-none",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          style.iconWrap,
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-[#64748B] dark:text-[#A9B8CC]">
                          {item.description}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
