import { useState, useMemo } from "react";

export function useTableFilter<T>(data: T[]) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;

    return data.filter((item) =>
      Object.values(item as any).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  return { filteredData, searchTerm, setSearchTerm };
}
