import { useNavigate } from "react-router-dom";
import { Bell, User, Moon, Sun, LogOut, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger />
          <AppBrand variant="header" className="lg:hidden" />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-button hover-scale overflow-visible"
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
                  className="rounded-button overflow-visible"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                </Button>
                <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-card">
                  2
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                <div className="font-medium text-sm">Expiry Alert</div>
                <div className="text-xs text-muted-foreground">
                  5 batches expiring in next 7 days
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                <div className="font-medium text-sm">Low Stock Warning</div>
                <div className="text-xs text-muted-foreground">
                  Product XYZ below minimum threshold
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="rounded-full overflow-visible h-10 gap-2 px-2 sm:px-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-from to-brand-to flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-white">{initials}</span>
                </div>
                <div className="hidden md:flex flex-col items-start text-left min-w-0">
                  <span className="text-sm font-semibold leading-tight truncate max-w-[140px]">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight truncate max-w-[140px]">
                    {depotLabel}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Warehouse className="h-3 w-3 shrink-0" />
                    {depotLabel}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="h-4 w-4 mr-2" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
