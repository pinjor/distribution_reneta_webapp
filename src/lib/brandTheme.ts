/** Renata brand palette — sky blue linear gradient (#0096D6 → #0077C0) */
export const BRAND = {
  from: "#0096D6",
  to: "#0077C0",
  deep: "#005a8c",
  tileFrom: "#eef9fd",
  tileVia: "#dff2fa",
  tileTo: "#cce9f7",
} as const;

/** Mild sky-blue gradient for navigation & stat tile cards */
export const brandTileClasses =
  "border-brand-from/25 bg-gradient-to-br from-brand-tile-from via-brand-tile-via to-brand-tile-to shadow-sm";

/** Solid brand gradient for icons, buttons, accents */
export const brandGradientClasses =
  "bg-gradient-to-r from-brand-from to-brand-to text-white";

export const brandIconBoxClasses =
  "bg-gradient-to-br from-brand-from to-brand-to text-white shadow-sm shadow-brand-from/25";

export const brandLabelClasses = "text-brand-deep";
export const brandMutedClasses = "text-brand-to/80";
