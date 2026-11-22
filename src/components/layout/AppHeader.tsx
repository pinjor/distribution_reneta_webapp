import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, Moon, Sun, User, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { cn } from "@/lib/utils";

type DeskNotice = {
  id: string;
  title: string;
  body: string;
  read: boolean;
};

const DESK_NOTICES: DeskNotice[] = [
  {
    id: "expiry",
    title: "Expiry Alert",
    body: "5 batches expiring in next 7 days",
    read: false,
  },
  {
    id: "stock",
    title: "Low Stock Warning",
    body: "Product XYZ below minimum threshold",
    read: false,
  },
];

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDashboard = pathname === "/";

  const displayName = getUserDisplayName(user);
  const dashboardName = user?.first_name
    ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ""}`
    : "there";
  const initials = getUserInitials(user);
  const roleLabel = formatRoleLabel(user?.role);
  const depotLabel = user?.depot?.name ?? (user?.role?.toLowerCase() === "admin" ? "All Depots" : "No depot assigned");
  const [notices, setNotices] = useState(DESK_NOTICES);
  const unreadCount = notices.filter((notice) => !notice.read).length;

  const markNoticeRead = (id: string) => {
    setNotices((current) =>
      current.map((notice) => (notice.id === id ? { ...notice, read: true } : notice)),
    );
  };

  const markAllNoticesRead = () => {
    setNotices((current) => current.map((notice) => ({ ...notice, read: true })));
  };

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
    <header className="sticky top-0 z-30 w-full border-b border-[#D5E1F2] bg-white/95 shadow-[0_10px_28px_-22px_rgba(12,76,161,0.7)] backdrop-blur-sm dark:border-white/10 dark:bg-card">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger className="h-9 w-9 rounded-xl text-[#0C4CA1] hover:bg-[#E7EEF8] hover:text-[#08357A]" />
          <AppBrand variant="header" className="lg:hidden" />
          {isDashboard && (
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight tracking-tight text-[#0B1B33] dark:text-foreground">
                {dashboardName}
              </h1>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-xl text-[#0C4CA1] hover:bg-[#E7EEF8] hover:text-[#08357A]"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="relative inline-flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl text-[#0C4CA1] hover:bg-[#E7EEF8] hover:text-[#08357A]"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                </Button>
                {unreadCount > 0 && (
                  <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#0C4CA1] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-card">
                    {unreadCount}
                  </span>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="w-[360px] overflow-hidden rounded-2xl border border-[#D5E1F2] bg-white p-0 text-[#0B1B33] shadow-[0_24px_50px_-28px_rgba(12,76,161,0.55)] dark:border-white/10 dark:bg-card dark:text-foreground"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#E4ECF6] px-4 py-3 dark:border-white/10">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0B1B33] dark:text-foreground">Notifications</p>
                  <p className="mt-0.5 text-[11px] text-[#5C7190] dark:text-muted-foreground">
                    {unreadCount} unread
                  </p>
                </div>
                <button
                  type="button"
                  onClick={markAllNoticesRead}
                  disabled={unreadCount === 0}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[#0C4CA1] hover:bg-[#E7EEF8] disabled:cursor-default disabled:text-[#8AA0BE] disabled:hover:bg-transparent"
                >
                  Read all
                </button>
              </div>
              <ul>
                {notices.map((notice) => (
                  <li key={notice.id} className="border-b border-[#E4ECF6] last:border-b-0 dark:border-white/10">
                    <div className={cn("flex gap-3 px-4 py-3", !notice.read && "bg-[#F7FAFE] dark:bg-white/5")}>
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          notice.read ? "bg-transparent" : "bg-[#0C4CA1]",
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p
                            className={cn(
                              "text-sm leading-tight",
                              notice.read
                                ? "font-medium text-[#5C7190] dark:text-muted-foreground"
                                : "font-semibold text-[#0B1B33] dark:text-foreground",
                            )}
                          >
                            {notice.title}
                          </p>
                          {!notice.read && (
                            <button
                              type="button"
                              onClick={() => markNoticeRead(notice.id)}
                              className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-[#0C4CA1] hover:bg-white"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-[#5C7190] dark:text-muted-foreground">
                          {notice.body}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 overflow-visible rounded-full px-2 hover:bg-[#E7EEF8] sm:px-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0C4CA1]">
                  <span className="text-sm font-bold text-white">{initials}</span>
                </div>
                <div className="hidden md:flex flex-col items-start text-left min-w-0">
                  <span className="max-w-[140px] truncate text-sm font-semibold leading-tight text-[#0B1B33] dark:text-foreground">
                    {displayName}
                  </span>
                  <span className="max-w-[140px] truncate text-[11px] leading-tight text-[#2C4A73] dark:text-muted-foreground">
                    {depotLabel}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="w-[280px] rounded-2xl border border-[#D5E1F2] bg-white p-2 text-[#0B1B33] shadow-[0_24px_50px_-28px_rgba(12,76,161,0.55)] dark:border-white/10 dark:bg-card dark:text-foreground"
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 rounded-xl bg-[#E7EDF7] px-3 py-3 dark:bg-white/5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0C4CA1] text-sm font-bold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight text-[#0B1B33] dark:text-foreground">
                      {displayName}
                    </p>
                    <p className="mt-1 truncate text-xs font-medium text-[#0C4CA1]">{roleLabel}</p>
                    <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-[#2C4A73] dark:text-muted-foreground">
                      <Warehouse className="h-3 w-3 shrink-0" />
                      {depotLabel}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="mt-2 cursor-pointer rounded-xl px-2.5 py-2 text-[#0B1B33] focus:bg-[#E7EEF8] focus:text-[#0C4CA1] dark:text-foreground"
                onClick={() => navigate("/profile")}
              >
                <span className="mr-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#E7EEF8] text-[#0C4CA1]">
                  <User className="h-4 w-4" />
                </span>
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer rounded-xl px-2.5 py-2 text-[#9B2335] focus:bg-[#FDECEC] focus:text-[#9B2335]"
                onClick={handleSignOut}
              >
                <span className="mr-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#FDECEC] text-[#9B2335]">
                  <LogOut className="h-4 w-4" />
                </span>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
