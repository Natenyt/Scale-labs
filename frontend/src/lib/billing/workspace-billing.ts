import { DEMO_BILLING_SNAPSHOT } from "@/lib/demo/acme-presentation-data";
import { isDemoWorkspaceUser } from "@/lib/demo/constants";
import type { PlanId } from "@/lib/mock/billing";

export type WorkspaceBillingSnapshot = {
  planId: PlanId;
  minutesUsed: number;
  minutesIncluded: number;
  agentsInUse: number;
  workflowsInUse: number;
  numbersInUse: number;
  integrationsConnected: number;
  invoicesAreSample: boolean;
};

export type WorkspaceUsageCounts = {
  agentsInUse: number;
  workflowsInUse: number;
  numbersInUse: number;
  integrationsConnected: number;
  minutesUsed: number | null;
};

const DEFAULT_PLAN_ID: PlanId = "operations";

/**
 * Resolve plan + usage for the active workspace.
 * Demo account uses a fixed Scale-tier snapshot; other accounts use live counts.
 */
export function resolveWorkspaceBilling(
  user: { email: string } | null | undefined,
  usage: WorkspaceUsageCounts,
): WorkspaceBillingSnapshot {
  if (isDemoWorkspaceUser(user)) {
    return DEMO_BILLING_SNAPSHOT as WorkspaceBillingSnapshot;
  }

  const minutesUsed =
    usage.minutesUsed ??
    0;

  const planId: PlanId =
    minutesUsed > 5500 ? "scale" : minutesUsed > 1200 ? "operations" : DEFAULT_PLAN_ID;

  const included =
    planId === "scale" ? 6000 : planId === "operations" ? 1500 : 150;

  return {
    planId,
    minutesUsed,
    minutesIncluded: included,
    agentsInUse: usage.agentsInUse,
    workflowsInUse: usage.workflowsInUse,
    numbersInUse: usage.numbersInUse,
    integrationsConnected: usage.integrationsConnected,
    invoicesAreSample: false,
  };
}
