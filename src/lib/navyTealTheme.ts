/**
 * Migrated-page theme helpers (Corporate Blue #0C4DA1).
 * Wrap migrated pages in ThemeScope; brand utilities remap via CSS variables.
 * Scope class name is retained for compatibility.
 */

import { cn } from "@/lib/utils";

export const NAVY_TEAL_SCOPE_CLASS = "theme-scope-navy-teal";

export const ntTileClasses =
  "nt-tile-card rounded-2xl border-2 transition-all duration-300 hover:-translate-y-1";

export const ntIconBoxClasses =
  "bg-gradient-to-br from-nt-accent to-nt-accent-hover text-white shadow-sm";

export const ntLabelClasses = "text-nt-primary";
export const ntMutedClasses = "text-nt-text-secondary";

export const ntBannerClasses = "nt-banner";

export function themeScopeClassName(...extras: Array<string | undefined | false>) {
  return cn(NAVY_TEAL_SCOPE_CLASS, ...extras);
}
