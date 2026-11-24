import { useEffect, useState } from "react";
import { apiEndpoints } from "@/lib/api";

/** Permissions from GET /api/auth/permissions. Null while the request is in flight. */
export function usePermissions(): string[] | null {
  const [permissions, setPermissions] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiEndpoints
      .authPermissions()
      .then((data) => {
        if (!cancelled) setPermissions(Array.isArray(data?.permissions) ? data.permissions : []);
      })
      .catch(() => {
        if (!cancelled) setPermissions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return permissions;
}
