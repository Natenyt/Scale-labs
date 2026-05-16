"use client";

import * as React from "react";

import {
  createWorkflow as createWorkflowImpl,
  deleteWorkflow as deleteWorkflowImpl,
  getServerSnapshot,
  getSnapshot,
  isHydrated,
  replaceGraph as replaceGraphImpl,
  setSyncStatus as setSyncStatusImpl,
  setVapiWorkflowId as setVapiWorkflowIdImpl,
  subscribe,
  updateWorkflow as updateWorkflowImpl,
  type CreateWorkflowInput,
} from "@/lib/workflows/store";
import type {
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowSyncStatus,
} from "@/lib/workflows/types";

/**
 * Passthrough provider — see `IntegrationsProvider` for the pattern.
 * Lives in the (app) layout so any page can call `useWorkflows()`.
 */
export function WorkflowsProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

type WorkflowsHook = {
  workflows: Workflow[];
  ready: boolean;
  byId: (id: string) => Workflow | undefined;
  createWorkflow: (input: CreateWorkflowInput) => Workflow;
  updateWorkflow: (
    id: string,
    patch: Partial<
      Pick<
        Workflow,
        "name" | "description" | "globalPrompt" | "nodes" | "edges"
      >
    >,
  ) => void;
  replaceGraph: (
    id: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ) => void;
  deleteWorkflow: (id: string) => void;
  setSyncStatus: (
    id: string,
    status: WorkflowSyncStatus,
    error?: string,
  ) => void;
  setVapiWorkflowId: (
    id: string,
    vapiWorkflowId: string,
    lastSyncedAt: string,
  ) => void;
};

export function useWorkflows(): WorkflowsHook {
  const workflows = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const ready = React.useSyncExternalStore(
    subscribe,
    isHydrated,
    () => false,
  );

  return React.useMemo<WorkflowsHook>(
    () => ({
      workflows,
      ready,
      byId: (id) => workflows.find((w) => w.id === id),
      createWorkflow: createWorkflowImpl,
      updateWorkflow: updateWorkflowImpl,
      replaceGraph: replaceGraphImpl,
      deleteWorkflow: deleteWorkflowImpl,
      setSyncStatus: setSyncStatusImpl,
      setVapiWorkflowId: setVapiWorkflowIdImpl,
    }),
    [workflows, ready],
  );
}
