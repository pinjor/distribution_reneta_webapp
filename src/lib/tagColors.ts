/**
 * Consistent color scheme for all status tags across the application
 * All tags use vibrant, eye-catching colors for better visibility
 */

export const TAG_COLORS = {
  // Delivery Status Tags
  "Accepted": {
    bg: "#10b981", // emerald-500
    text: "#ffffff",
    className: "bg-emerald-500 text-white",
    style: { backgroundColor: "#10b981", color: "#ffffff" }
  },
  "Out for Delivery": {
    bg: "#f97316", // orange-500
    text: "#ffffff",
    className: "bg-orange-500 text-white",
    style: { backgroundColor: "#f97316", color: "#ffffff" }
  },
  "Fully Delivered": {
    bg: "#059669", // emerald-600
    text: "#ffffff",
    className: "bg-emerald-600 text-white",
    style: { backgroundColor: "#059669", color: "#ffffff" }
  },
  "Partial Delivered": {
    bg: "#ea580c", // orange-600
    text: "#ffffff",
    className: "bg-orange-600 text-white",
    style: { backgroundColor: "#ea580c", color: "#ffffff" }
  },
  "Postponed": {
    bg: "#dc2626", // red-600
    text: "#ffffff",
    className: "bg-red-600 text-white",
    style: { backgroundColor: "#dc2626", color: "#ffffff" }
  },

  // Collection Status Tags
  "Fully Collected": {
    bg: "#059669", // emerald-600
    text: "#ffffff",
    className: "bg-emerald-600 text-white",
    style: { backgroundColor: "#059669", color: "#ffffff" }
  },
  "Partially Collected": {
    bg: "#ea580c", // orange-600
    text: "#ffffff",
    className: "bg-orange-600 text-white",
    style: { backgroundColor: "#ea580c", color: "#ffffff" }
  },
  "Pending": {
    bg: "#6b7280", // gray-500
    text: "#ffffff",
    className: "bg-gray-500 text-white",
    style: { backgroundColor: "#6b7280", color: "#ffffff" }
  },

  // Order Status Tags
  "Validated": {
    bg: "#4f46e5", // indigo-600
    text: "#ffffff",
    className: "bg-indigo-600 text-white",
    style: { backgroundColor: "#4f46e5", color: "#ffffff" }
  },
  "Printed": {
    bg: "#14b8a6", // teal-500
    text: "#ffffff",
    className: "bg-teal-500 text-white",
    style: { backgroundColor: "#14b8a6", color: "#ffffff" }
  },
  "Assigned": {
    bg: "#7c3aed", // violet-600
    text: "#ffffff",
    className: "bg-violet-600 text-white",
    style: { backgroundColor: "#7c3aed", color: "#ffffff" }
  },
  "Loaded": {
    bg: "#2563eb", // blue-600
    text: "#ffffff",
    className: "bg-blue-600 text-white",
    style: { backgroundColor: "#2563eb", color: "#ffffff" }
  },
  "Pending Validation": {
    bg: "#9ca3af", // gray-400
    text: "#ffffff",
    className: "bg-gray-400 text-white",
    style: { backgroundColor: "#9ca3af", color: "#ffffff" }
  },
  "Pending Print": {
    bg: "#06b6d4", // cyan-500
    text: "#ffffff",
    className: "bg-cyan-500 text-white",
    style: { backgroundColor: "#06b6d4", color: "#ffffff" }
  },
  "Pending Collection": {
    bg: "#f59e0b", // amber-500
    text: "#ffffff",
    className: "bg-amber-500 text-white",
    style: { backgroundColor: "#f59e0b", color: "#ffffff" }
  },
} as const;

/**
 * Get tag color configuration for a given status
 */
export function getTagColor(status: string | null | undefined) {
  if (!status) {
    return TAG_COLORS["Pending"];
  }
  const normalizedStatus = status.trim();
  return TAG_COLORS[normalizedStatus as keyof typeof TAG_COLORS] || TAG_COLORS["Pending"];
}

/**
 * Create a vibrant tag component with consistent styling
 */
export function createTagStyle(status: string | null | undefined) {
  const colorConfig = getTagColor(status);
  return {
    ...colorConfig.style,
    fontWeight: "600" as const,
    fontSize: "0.75rem",
    padding: "0.25rem 0.625rem",
    borderRadius: "0.375rem",
    display: "inline-flex",
    alignItems: "center",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    border: "none",
    whiteSpace: "nowrap" as const,
  };
}

