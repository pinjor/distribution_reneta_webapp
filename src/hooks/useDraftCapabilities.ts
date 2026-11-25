import { useEffect, useState } from "react";
import { apiEndpoints } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  DISABLED_DRAFT_MODULE,
  sanitizeModuleCapability,
  type DraftModuleCapability,
} from "@/lib/draftCapabilities";

type DraftCapabilitiesState = {
  loading: boolean;
  error: string | null;
  sample_gift: DraftModuleCapability;
  export: DraftModuleCapability;
};

const SAFE: DraftCapabilitiesState = {
  loading: false,
  error: null,
  sample_gift: DISABLED_DRAFT_MODULE,
  export: DISABLED_DRAFT_MODULE,
};

export function useDraftCapabilities(): DraftCapabilitiesState {
  const { isAuthenticated, user } = useAuth();
  const [state, setState] = useState<DraftCapabilitiesState>({
    ...SAFE,
    loading: Boolean(isAuthenticated),
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setState(SAFE);
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    apiEndpoints.draftModules
      .capabilities()
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          sample_gift: sanitizeModuleCapability(data?.sample_gift),
          export: sanitizeModuleCapability(data?.export),
        });
      })
      .catch((err: any) => {
        if (cancelled) return;
        setState({
          ...SAFE,
          error: err?.message || "Unable to load draft permissions",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, user?.role]);

  return state;
}
