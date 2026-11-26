import { createRoot } from "react-dom/client";
import IsolatedWorkflowApp from "./App";
import { assertIsolatedBackend, assertIsolatedFrontendConfig } from "./runtime";
import "../index.css";

async function boot() {
  const root = document.getElementById("root");
  if (!root) throw new Error("root missing");
  try {
    const api = assertIsolatedFrontendConfig();
    await assertIsolatedBackend(api);
    createRoot(root).render(<IsolatedWorkflowApp />);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Isolated workflow failed to start";
    root.innerHTML = `<main style="padding:2rem;font-family:sans-serif"><h1>Isolated workflow blocked</h1><p data-testid="isolated-boot-error">${message}</p></main>`;
  }
}

void boot();
