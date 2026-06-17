/**
 * Navigation card visual variant for menu hubs (Distribution Cockpit, Dashboard quick actions, etc.)
 *
 * - `'expand'`  — expand-on-hover card rows (current)
 * - `'display'` — stacked / skewed DisplayCards style
 * - `'tile'`    — animated gradient tile cards
 *
 * Change NAV_CARD_VARIANT to switch designs instantly.
 */
export type NavCardVariant = "expand" | "display" | "tile";

export const NAV_CARD_VARIANT: NavCardVariant = "expand";
