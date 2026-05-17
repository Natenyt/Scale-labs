import { applyAgentsHydrate } from "@/lib/agents/hydrate-bridge";
import { clearDemoPresentationCaches } from "@/lib/demo/acme-presentation-data";
import { setDemoSession } from "@/lib/demo/constants";
import { resetIntegrationsStore } from "@/lib/integrations/store";
import { clearQueryCache } from "@/lib/query/query-client";
import { resetWorkflowsStore } from "@/lib/workflows/store";

/**
 * Drop client-side caches so another account/org never sees the previous user's
 * integrations/workflows from localStorage.
 */
export function clearClientStores(): void {
  setDemoSession(false);
  clearDemoPresentationCaches();
  clearQueryCache();
  resetIntegrationsStore();
  resetWorkflowsStore();
  applyAgentsHydrate({
    agents: [],
    remote: false,
    apiAgentsLoadFailed: false,
  });
}
