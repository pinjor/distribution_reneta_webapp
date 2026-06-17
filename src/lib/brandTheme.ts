/** Brand palette — cyan linear gradient (#6ac6df → #4ab8d4) */
export const BRAND = {
  from: "#6ac6df",
  to: "#4ab8d4",
  deep: "#2a8aa0",
  hoverFrom: "#58bdd6",
  hoverTo: "#3aadc9",
  tileFrom: "#eef8fb",
  tileVia: "#d9f0f6",
  tileTo: "#c4e8f1",
} as const;

/** Mild brand gradient for navigation & stat tile cards */
export const brandTileClasses =
  "rounded-2xl border-2 border-brand-from/20 bg-gradient-to-br from-white via-brand-tile-from to-brand-tile-via shadow-[0_4px_20px_-4px_rgba(106,198,223,0.25)] transition-all duration-300 hover:border-brand-from/45 hover:shadow-[0_12px_32px_-8px_rgba(106,198,223,0.45)] hover:-translate-y-1";

/** Solid brand gradient for icons, buttons, accents */
export const brandGradientClasses =
  "bg-gradient-to-r from-brand-from to-brand-to text-white";

export const brandIconBoxClasses =
  "bg-gradient-to-br from-brand-from to-brand-to text-white shadow-sm shadow-brand-from/25";

export const brandLabelClasses = "text-brand-deep";
export const brandMutedClasses = "text-brand-to/80";

/** Unified pill button — white surface, brand-deep title (matches header tabs) */
export const brandButtonClasses =
  "rounded-full bg-white text-brand-deep font-semibold border border-brand-from/35 shadow-sm hover:bg-brand-tile-from hover:border-brand-from/50 hover:shadow-md";

export const brandButtonSoftClasses =
  "rounded-full bg-brand-tile-from text-brand-deep font-semibold border border-brand-from/30 shadow-sm hover:bg-brand-tile-via hover:border-brand-from/45";
