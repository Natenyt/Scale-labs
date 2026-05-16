import type { Agent } from "@/lib/agents/types";

export type AgentsHydratePayload = {
  agents: Agent[];
  remote: boolean;
  apiAgentsLoadFailed: boolean;
};

let applyHydrate: ((payload: AgentsHydratePayload) => void) | null = null;

export function registerAgentsHydrate(
  fn: (payload: AgentsHydratePayload) => void,
): () => void {
  applyHydrate = fn;
  return () => {
    if (applyHydrate === fn) applyHydrate = null;
  };
}

export function applyAgentsHydrate(payload: AgentsHydratePayload): void {
  applyHydrate?.(payload);
}
