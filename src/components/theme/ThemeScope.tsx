import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NAVY_TEAL_SCOPE_CLASS } from "@/lib/navyTealTheme";

interface ThemeScopeProps {
  children: ReactNode;
  className?: string;
}

/**
 * Isolates Corporate Blue (#0C4DA1) design tokens to a migrated page subtree.
 * Shared chrome (sidebar/header) outside this wrapper keeps the legacy theme.
 */
export function ThemeScope({ children, className }: ThemeScopeProps) {
  return (
    <div className={cn(NAVY_TEAL_SCOPE_CLASS, "rounded-none", className)}>
      {children}
    </div>
  );
}
