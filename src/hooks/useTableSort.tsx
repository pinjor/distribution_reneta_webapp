import { useState, useMemo } from "react";

export function useTableSort<T>(data: T[], initialKey?: keyof T) {
  const [sortKey, setSortKey] = useState<keyof T | null>(initialKey || null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [data, sortKey, sortOrder]);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return { sortedData, sortKey, sortOrder, handleSort };
}
