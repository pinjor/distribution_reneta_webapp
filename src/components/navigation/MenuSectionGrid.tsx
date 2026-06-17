import { NAV_CARD_VARIANT } from "@/lib/uiDesign";
import type { MenuNavSection } from "@/lib/menuNavigation";
import { MenuDisplaySectionGrid } from "@/components/navigation/MenuDisplaySectionGrid";
import { MenuExpandSectionGrid } from "@/components/navigation/MenuExpandSectionGrid";
import { MenuTileSectionGrid } from "@/components/navigation/MenuTileSectionGrid";

interface MenuSectionGridProps {
  sections: MenuNavSection[];
  className?: string;
}

/**
 * Renders menu sections using NAV_CARD_VARIANT from `src/lib/uiDesign.ts`.
 *
 * - `'expand'`  → expand-on-hover rows
 * - `'display'` → skewed DisplayCards stacks
 * - `'tile'`    → previous animated tile cards
 */
export function MenuSectionGrid(props: MenuSectionGridProps) {
  if (NAV_CARD_VARIANT === "expand") {
    return <MenuExpandSectionGrid {...props} />;
  }
  if (NAV_CARD_VARIANT === "display") {
    return <MenuDisplaySectionGrid {...props} />;
  }
  return <MenuTileSectionGrid {...props} />;
}
