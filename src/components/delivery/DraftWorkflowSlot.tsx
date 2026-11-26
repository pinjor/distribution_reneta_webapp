import { createContext, useContext, type ReactNode } from "react";

/**
 * Empty slot on production Draft detail pages.
 * Isolated F.4B.3-DEV supplies actions via DraftWorkflowSlotProvider.
 * This file must not import the isolated workflow module.
 */
const DraftWorkflowSlotContext = createContext<ReactNode>(null);

export function DraftWorkflowSlotProvider({
  slot,
  children,
}: {
  slot: ReactNode;
  children: ReactNode;
}) {
  return <DraftWorkflowSlotContext.Provider value={slot}>{children}</DraftWorkflowSlotContext.Provider>;
}

export function DraftWorkflowSlot() {
  return <>{useContext(DraftWorkflowSlotContext)}</>;
}
