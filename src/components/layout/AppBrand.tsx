import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/renata-logo.png";

interface AppBrandProps {
  /** Sidebar collapsed to icon rail */
  collapsed?: boolean;
  /** Light text for dark sidebar; dark text for light header */
  variant?: "sidebar" | "header";
  className?: string;
}

export function AppBrand({ collapsed = false, variant = "sidebar", className }: AppBrandProps) {
  const isSidebar = variant === "sidebar";

  return (
    <Link
      to="/"
      className={cn(
        "flex items-center min-w-0 transition-opacity hover:opacity-90",
        collapsed ? "justify-center gap-0" : "gap-3",
        className,
      )}
      title="RENATA DMS — Distribution Management System"
    >
      <img
        src={LOGO_SRC}
        alt="RENATA DMS"
        className={cn(
          "shrink-0 rounded-xl object-cover shadow-sm",
          collapsed ? "h-9 w-9" : "h-10 w-10",
        )}
      />
      {!collapsed && (
        <span
          className={cn(
            "text-base font-bold tracking-[0.08em] truncate",
            isSidebar ? "text-sidebar-foreground" : "text-brand-deep",
          )}
        >
          RENATA DMS
        </span>
      )}
    </Link>
  );
}

export { LOGO_SRC };
