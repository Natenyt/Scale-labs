"use client";

import * as React from "react";

import { useAgentsState } from "@/components/agents/agents-store";
import { useIntegrations } from "@/components/integrations/integrations-store";
import { useWorkflows } from "@/components/workflows/workflows-store";
import { useAuth } from "@/contexts/auth-context";
import { useMetricsQuery } from "@/lib/query/use-metrics-query";
import { usePhoneNumbersQuery } from "@/lib/query/use-phone-numbers-query";

import {
  resolveWorkspaceBilling,
  type WorkspaceBillingSnapshot,
} from "./workspace-billing";

export function useWorkspaceBilling(): WorkspaceBillingSnapshot {
  const { user, isDemoWorkspace } = useAuth();
  const { agents } = useAgentsState();
  const { workflows } = useWorkflows();
  const { integrations } = useIntegrations();

  const metricsQuery = useMetricsQuery({
    days: 30,
    step: "day",
  });
  const phonesQuery = usePhoneNumbersQuery();

  return React.useMemo(() => {
    const publishedWorkflows = workflows.filter(
      (w) => (w.vapiWorkflowId?.trim() || w.syncStatus === "synced") && w.nodes.length > 0,
    );

    const minutesUsed =
      metricsQuery.data?.kpis.totalMinutes ??
      agents.reduce((sum, a) => sum + (a.minutesThisMonth ?? 0), 0);

    return resolveWorkspaceBilling(user, {
      agentsInUse: agents.length,
      workflowsInUse: publishedWorkflows.length || workflows.length,
      numbersInUse: phonesQuery.data?.length ?? 0,
      integrationsConnected: integrations.length,
      minutesUsed: isDemoWorkspace ? null : minutesUsed,
    });
  }, [
    agents,
    integrations.length,
    isDemoWorkspace,
    metricsQuery.data?.kpis.totalMinutes,
    phonesQuery.data?.length,
    user,
    workflows,
  ]);
}
