/**
 * Create a workflow from a template (blank or Vapi export).
 */

import { apiFetch } from "@/lib/api/client";
import { hasBackendApi } from "@/lib/api/env";
import type { VapiWorkflowPayload } from "@/lib/vapi/server";

import { defaultStartNode, type CreateWorkflowInput } from "./store";
import {
  getWorkflowTemplate,
  type WorkflowTemplateId,
} from "./templates";
import type { Workflow } from "./types";
import { importVapiWorkflow } from "./vapi-import";
import {
  syncWorkflowWithVapiPayload,
  type WorkflowSyncMutators,
} from "./sync-client";

export type CreateWorkflowMutators = WorkflowSyncMutators & {
  createWorkflow: (input: CreateWorkflowInput) => Workflow;
};

type DjangoWorkflowRow = {
  id: string;
  name: string;
  graph: { nodes: Workflow["nodes"]; edges: Workflow["edges"] };
  global_prompt: string;
  vapi_workflow_id: string | null;
  last_synced_at: string | null;
};

export class CreateWorkflowError extends Error {
  body?: unknown;

  constructor(message: string, body?: unknown) {
    super(message);
    this.name = "CreateWorkflowError";
    this.body = body;
  }
}

async function persistWorkflowToApi(input: {
  name: string;
  nodes: Workflow["nodes"];
  edges: Workflow["edges"];
  globalPrompt?: string;
}): Promise<DjangoWorkflowRow> {
  try {
    return await apiFetch<DjangoWorkflowRow>("/api/v1/workflows/", {
      method: "POST",
      json: {
        name: input.name,
        graph: { nodes: input.nodes, edges: input.edges },
        global_prompt: input.globalPrompt ?? "",
      },
    });
  } catch (e) {
    const body =
      e instanceof Error && "body" in e
        ? (e as Error & { body?: unknown }).body
        : undefined;
    const message = e instanceof Error ? e.message : "Could not create workflow";
    throw new CreateWorkflowError(message, body);
  }
}

export async function createWorkflowFromTemplate(
  templateId: WorkflowTemplateId,
  name: string,
  mutators: CreateWorkflowMutators,
): Promise<Workflow> {
  const trimmedName = name.trim() || "Untitled workflow";
  const template = getWorkflowTemplate(templateId);
  const { createWorkflow, setSyncStatus, setVapiWorkflowId } = mutators;

  if (templateId === "blank") {
    const nodes = [defaultStartNode()];
    const edges: Workflow["edges"] = [];

    if (hasBackendApi()) {
      const row = await persistWorkflowToApi({
        name: trimmedName,
        nodes,
        edges,
      });
      return createWorkflow({
        id: row.id,
        name: row.name,
        nodes: row.graph.nodes,
        edges: row.graph.edges,
        globalPrompt: row.global_prompt || undefined,
      });
    }

    return createWorkflow({ name: trimmedName, nodes, edges });
  }

  if (!template.vapi) {
    throw new CreateWorkflowError("Template is missing Vapi definition.");
  }

  const imported = importVapiWorkflow(template.vapi);
  const vapiPayload: VapiWorkflowPayload = {
    ...template.vapi,
    name: trimmedName,
  };

  if (hasBackendApi()) {
    const row = await persistWorkflowToApi({
      name: trimmedName,
      nodes: imported.nodes,
      edges: imported.edges,
      globalPrompt: imported.globalPrompt,
    });

    const record = createWorkflow({
      id: row.id,
      name: row.name,
      nodes: imported.nodes,
      edges: imported.edges,
      globalPrompt: imported.globalPrompt,
    });

    const sync = await syncWorkflowWithVapiPayload(
      record,
      vapiPayload,
      { setSyncStatus, setVapiWorkflowId },
      { silent: true },
    );

    if (!sync.ok) {
      throw new CreateWorkflowError(
        "Workflow saved locally but Vapi sync failed. Open the workflow and try Save again.",
      );
    }

    return {
      ...record,
      vapiWorkflowId: sync.vapiWorkflowId ?? record.vapiWorkflowId,
      syncStatus: "synced",
      lastSyncedAt: new Date().toISOString(),
    };
  }

  const record = createWorkflow({
    name: trimmedName,
    nodes: imported.nodes,
    edges: imported.edges,
    globalPrompt: imported.globalPrompt,
  });

  const sync = await syncWorkflowWithVapiPayload(
    record,
    vapiPayload,
    { setSyncStatus, setVapiWorkflowId },
    { silent: true },
  );

  if (!sync.ok) {
    throw new CreateWorkflowError(
      "Workflow created locally but Vapi sync failed. Open the workflow and try Save again.",
    );
  }

  return {
    ...record,
    vapiWorkflowId: sync.vapiWorkflowId ?? record.vapiWorkflowId,
    syncStatus: "synced",
    lastSyncedAt: new Date().toISOString(),
  };
}
