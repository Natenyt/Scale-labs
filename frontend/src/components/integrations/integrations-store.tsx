"use client";

import * as React from "react";

import {
  createNotion as createNotionImpl,
  deleteIntegration as deleteIntegrationImpl,
  getServerSnapshot,
  getSnapshot,
  isHydrated,
  notionRemainingSlots as notionRemainingSlotsImpl,
  setSyncStatus as setSyncStatusImpl,
  setVapiTools as setVapiToolsImpl,
  subscribe,
  updateNotion as updateNotionImpl,
  type CreateNotionInput,
} from "@/lib/integrations/store";
import type {
  Integration,
  IntegrationSyncStatus,
  NotionIntegration,
  VapiToolRef,
} from "@/lib/integrations/types";

/**
 * Passthrough provider. The actual state lives in the singleton at
 * `lib/integrations/store.ts` so we can read it via `useSyncExternalStore`
 * without SSR/CSR mismatches. The provider is kept for symmetry with
 * `<AgentsProvider>` and as the natural place to host future React Query
 * client / mutation context on Day 9.
 */
export function IntegrationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

type IntegrationsHook = {
  integrations: Integration[];
  /** True after the first client snapshot has hydrated from localStorage. */
  ready: boolean;
  byId: (id: string) => Integration | undefined;
  byKind: (kind: Integration["kind"]) => Integration[];
  notionRemainingSlots: number;
  createNotion: (input: CreateNotionInput) => NotionIntegration;
  updateNotion: (id: string, patch: Partial<NotionIntegration>) => void;
  deleteIntegration: (id: string) => void;
  setSyncStatus: (
    id: string,
    status: IntegrationSyncStatus,
    error?: string,
  ) => void;
  setVapiTools: (id: string, refs: VapiToolRef[]) => void;
};

export function useIntegrations(): IntegrationsHook {
  const integrations = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  // Track hydration so consumers can skip empty-state flashes on first paint.
  const ready = React.useSyncExternalStore(
    subscribe,
    isHydrated,
    () => false,
  );

  return React.useMemo<IntegrationsHook>(
    () => ({
      integrations,
      ready,
      byId: (id) => integrations.find((i) => i.id === id),
      byKind: (kind) => integrations.filter((i) => i.kind === kind),
      notionRemainingSlots: notionRemainingSlotsImpl(integrations),
      createNotion: createNotionImpl,
      updateNotion: updateNotionImpl,
      deleteIntegration: deleteIntegrationImpl,
      setSyncStatus: setSyncStatusImpl,
      setVapiTools: setVapiToolsImpl,
    }),
    [integrations, ready],
  );
}
