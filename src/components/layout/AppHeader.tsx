import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { User, Moon, Sun, LogOut, Warehouse, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppBrand } from "@/components/layout/AppBrand";
import { useTheme } from "@/contexts/ThemeContext";
import {
  useAuth,
  getUserDisplayName,
  getUserInitials,
  formatRoleLabel,
} from "@/contexts/AuthContext";
import { apiEndpoints } from "@/lib/api";
import { resolvePageTitle } from "@/lib/menuNavigation";
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown";

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pageMeta = resolvePageTitle(pathname);
  const reduceMotion = useReducedMotion();
  const titleTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const roleLabel = formatRoleLabel(user?.role);
  const depotLabel = user?.depot?.name ?? (user?.role?.toLowerCase() === "admin" ? "All Depots" : "No depot assigned");

  const handleSignOut = async () => {
    try {
      await apiEndpoints.auth.logout();
    } catch {
      // proceed with local logout
    }
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-card shadow-sm transition-colors backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <SidebarTrigger className="shrink-0" />
          <AppBrand variant="header" className="lg:hidden shrink-0" />
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={titleTransition}
              >
                <h1
                  className="truncate text-base sm:text-lg md:text-[1.25rem] font-semibold leading-tight tracking-tight text-foreground"
                  title={pageMeta.title}
                >
                  {pageMeta.title}
                </h1>
                {pageMeta.description ? (
                  <p className="mt-0.5 hidden truncate text-xs leading-tight text-muted-foreground sm:block">
                    {pageMeta.description}
                  </p>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            onClick={toggleTheme}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full bg-[#EAF2FC] p-0.5 dark:bg-[#1B304D]",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/40 focus-visible:ring-offset-2",
              "motion-reduce:transition-none",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                theme === "light" ? "bg-white text-amber-500 shadow-sm" : "text-[#A9B8CC]",
              )}
            >
              <Sun className="h-4 w-4" fill={theme === "light" ? "currentColor" : "none"} strokeWidth={2.25} aria-hidden />
            </span>
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                theme === "dark" ? "bg-[#0C4DA1] text-white shadow-sm" : "text-[#64748B]",
              )}
            >
              <Moon className="h-4 w-4" fill={theme === "dark" ? "currentColor" : "none"} strokeWidth={2.25} aria-hidden />
            </span>
          </button>

          <NotificationsDropdown />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Account menu for ${displayName}`}
                className={cn(
                  "group inline-flex h-10 max-w-full items-center gap-2 rounded-full py-0 pl-0.5 pr-1.5 sm:pr-2.5",
                  "bg-[#EAF2FC] text-left",
                  "transition-colors duration-150",
                  "hover:bg-[#d5e6fa]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/40 focus-visible:ring-offset-2",
                  "dark:bg-[#1B304D] dark:hover:bg-[#243a5c]",
                  "motion-reduce:transition-none",
                )}
              >
                <span
                  className="flex h-9 w-9 min-w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0C4DA1] text-[13px] font-bold leading-none text-white dark:bg-[#70ADFF] dark:text-[#0B1220]"
                  aria-hidden
                >
                  {initials}
                </span>
                <span
                  className="hidden min-w-0 max-w-[140px] truncate text-[13px] font-semibold leading-none text-[#0C4DA1] sm:inline dark:text-[#70ADFF]"
                  title={displayName}
                >
                  {displayName}
                </span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-[#0C4DA1] transition-transform duration-150 group-data-[state=open]:rotate-180 dark:text-[#70ADFF] motion-reduce:transition-none"
                  aria-hidden
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className={cn(
                "w-[min(292px,calc(100vw-1.5rem))] overflow-hidden rounded-[14px] border border-border bg-white p-0 text-foreground shadow-lg dark:bg-[#151F30]",
                "duration-150 data-[state=closed]:duration-150",
                "motion-reduce:animate-none motion-reduce:transition-none",
              )}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="bg-[#0C4DA1] px-3.5 py-3.5 dark:bg-[#173B71]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/25">
                      <span className="text-sm font-bold tracking-wide text-white">{initials}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight text-white" title={displayName}>
                        {displayName}
                      </p>
                      <p className="mt-0.5 truncate text-xs leading-tight text-white/75" title={roleLabel}>
                        {roleLabel}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2.5 flex min-w-0 items-center gap-1.5 text-xs leading-tight text-white/80">
                    <Warehouse className="h-3.5 w-3.5 shrink-0 text-white/90" aria-hidden />
                    <span className="truncate" title={depotLabel}>{depotLabel}</span>
                  </p>
                </div>
              </DropdownMenuLabel>

              <div className="bg-white px-1.5 py-1.5 dark:bg-[#151F30]">
                <DropdownMenuItem
                  onClick={() => navigate("/profile")}
                  className={cn(
                    "cursor-pointer gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9]",
                    "transition-colors duration-150",
                    "focus:bg-[#EAF2FC] focus:text-[#1E293B]",
                    "data-[highlighted]:bg-[#EAF2FC] data-[highlighted]:text-[#1E293B]",
                    "dark:focus:bg-[#1B304D] dark:focus:text-[#F1F5F9]",
                    "dark:data-[highlighted]:bg-[#1B304D] dark:data-[highlighted]:text-[#F1F5F9]",
                    "motion-reduce:transition-none",
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#EAF2FC] dark:bg-[#1B304D]">
                    <User className="h-4 w-4 text-[#0C4DA1] dark:text-[#70ADFF]" aria-hidden />
                  </span>
                  <span className="flex-1">My Profile</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#64748B] dark:text-[#A9B8CC]" aria-hidden />
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="mx-0 my-0 bg-[#E2E8F0] dark:bg-[#2C3B50]" />

              <div className="bg-white px-1.5 py-1.5 dark:bg-[#151F30]">
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className={cn(
                    "cursor-pointer gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-rose-700 dark:text-rose-300",
                    "transition-colors duration-150",
                    "focus:bg-rose-50 focus:text-rose-700",
                    "data-[highlighted]:bg-rose-50 data-[highlighted]:text-rose-700",
                    "dark:focus:bg-rose-950/40 dark:focus:text-rose-300",
                    "dark:data-[highlighted]:bg-rose-950/40 dark:data-[highlighted]:text-rose-300",
                    "motion-reduce:transition-none",
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-50 dark:bg-rose-950/40">
                    <LogOut className="h-4 w-4" aria-hidden />
                  </span>
                  Sign Out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
