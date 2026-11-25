import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker, type BlockerFunction } from "react-router-dom";

/**
 * Blocks in-app navigation (data router) and native beforeunload when dirty.
 * React Router 6.30 useBlocker requires createBrowserRouter / createMemoryRouter.
 */
export function useUnsavedDraftGuard(isDirty: boolean) {
  const skipBlockRef = useRef(false);
  const pendingLocalRef = useRef<(() => void) | null>(null);
  const [localOpen, setLocalOpen] = useState(false);

  const shouldBlock: BlockerFunction = useCallback(
    ({ currentLocation, nextLocation }) => {
      if (skipBlockRef.current) return false;
      if (nextLocation.pathname === "/login") return false;
      if (!isDirty) return false;
      return (
        currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search
      );
    },
    [isDirty]
  );
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const dialogOpen = localOpen || blocker.state === "blocked";

  const stay = useCallback(() => {
    pendingLocalRef.current = null;
    setLocalOpen(false);
    if (blocker.state === "blocked") blocker.reset();
  }, [blocker]);

  const discard = useCallback(() => {
    const local = pendingLocalRef.current;
    pendingLocalRef.current = null;
    setLocalOpen(false);
    if (blocker.state === "blocked") {
      skipBlockRef.current = true;
      blocker.proceed();
      return;
    }
    local?.();
  }, [blocker]);

  const allowNextNavigation = useCallback(() => {
    skipBlockRef.current = true;
  }, []);

  const confirmOrRun = useCallback(
    (action: () => void) => {
      if (!isDirty) {
        action();
        return;
      }
      pendingLocalRef.current = action;
      setLocalOpen(true);
    },
    [isDirty]
  );

  return { dialogOpen, stay, discard, allowNextNavigation, confirmOrRun };
}
