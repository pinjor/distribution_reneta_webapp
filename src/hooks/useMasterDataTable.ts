import { useState, useMemo, useEffect } from "react";

export interface UseMasterDataTableOptions<T> {
  data: T[];
  searchFields?: (keyof T)[];
  itemsPerPage?: number;
}

export interface UseMasterDataTableReturn<T> {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  filteredData: T[];
  paginatedData: T[];
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

/**
 * Custom hook for master data table with search and pagination
 */
export function useMasterDataTable<T extends Record<string, any>>({
  data,
  searchFields = [],
  itemsPerPage = 10,
}: UseMasterDataTableOptions<T>): UseMasterDataTableReturn<T> {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((item) => {
      // If no search fields specified, search all string fields
      if (searchFields.length === 0) {
        return Object.values(item).some((value) =>
          String(value).toLowerCase().includes(query)
        );
      }

      // Search only specified fields
      return searchFields.some((field) => {
        const value = item[field];
        return String(value).toLowerCase().includes(query);
      });
    });
  }, [data, searchQuery, searchFields]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    filteredData,
    paginatedData,
    totalPages,
    startIndex,
    endIndex,
    totalItems: filteredData.length,
  };
}

