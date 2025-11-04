import { BadgeProps } from "@/components/ui/badge";

type BadgeVariant = BadgeProps["variant"];

export type StatusColorMap = Record<string, BadgeVariant>;

/**
 * Default badge color mappings for common statuses
 */
export const defaultBadgeColors: StatusColorMap = {
  // Priority levels
  High: "destructive",
  Medium: "warning",
  Low: "info",
  
  // Status types
  Active: "success",
  Inactive: "secondary",
  Discontinued: "destructive",
  
  // Delivery status
  Open: "success",
  Block: "destructive",
  Closed: "secondary",
  
  // Credit status
  Credit: "default",
  Cash: "warning",
  
  // Stock status
  InStock: "success",
  OutOfStock: "destructive",
  LowStock: "warning",
  
  // Order status
  Pending: "warning",
  Approved: "success",
  Rejected: "destructive",
  Completed: "default",
};

/**
 * Gets the badge variant for a given status value
 * @param value - The status value
 * @param colorMap - Optional custom color mapping
 * @param defaultVariant - Default variant if no mapping found
 * @returns Badge variant
 */
export function getBadgeVariant(
  value: string | undefined | null,
  colorMap?: StatusColorMap,
  defaultVariant: BadgeVariant = "default"
): BadgeVariant {
  if (!value) return defaultVariant;
  
  const map = colorMap || defaultBadgeColors;
  return map[value] || defaultVariant;
}

/**
 * Creates a custom status color mapping
 */
export function createStatusColorMap(
  mappings: Record<string, BadgeVariant>
): StatusColorMap {
  return { ...defaultBadgeColors, ...mappings };
}

