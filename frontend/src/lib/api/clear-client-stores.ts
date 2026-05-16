import { applyAgentsHydrate } from "@/lib/agents/hydrate-bridge";
import { resetIntegrationsStore } from "@/lib/integrations/store";
import { resetWorkflowsStore } from "@/lib/workflows/store";

/**
 * Drop client-side caches so another account/org never sees the previous user's
 * integrations/workflows from localStorage.
 */
export function clearClientStores(): void {
  resetIntegrationsStore();
  resetWorkflowsStore();
  applyAgentsHydrate({
    agents: [],
    remote: false,
    apiAgentsLoadFailed: false,
  });
}
