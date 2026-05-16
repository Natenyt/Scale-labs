import { applyAgentsHydrate } from "@/lib/agents/hydrate-bridge";
import { fetchOrgAgentsFromApi } from "@/lib/agents/fetch-agents";
import { clearClientStores } from "@/lib/api/clear-client-stores";
import type { NotionIntegration } from "@/lib/integrations/types";
import { replaceAllIntegrations } from "@/lib/integrations/store";
import type { Workflow } from "@/lib/workflows/types";
import { replaceAllWorkflows } from "@/lib/workflows/store";

import { apiFetch } from "@/lib/api/client";

type DjangoWorkflow = {
  id: string;
  name: string;
  description?: string;
  global_prompt?: string;
  graph?: { nodes?: Workflow["nodes"]; edges?: Workflow["edges"] };
  vapi_workflow_id?: string;
  created_at: string;
  updated_at: string;
};

export type DjangoNotion = {
  id: string;
  kind: "notion";
  label: string;
  data_source_id: string;
  database_id: string;
  field_mappings: NotionIntegration["fieldMap"];
  vapi_tools: NotionIntegration["vapiTools"];
  created_at: string;
  updated_at: string;
};

function mapWorkflow(w: DjangoWorkflow): Workflow {
  const g = w.graph ?? {};
  return {
    id: w.id,
    name: w.name,
    description: w.description || undefined,
    globalPrompt: w.global_prompt || undefined,
    nodes: g.nodes ?? [],
    edges: g.edges ?? [],
    vapiWorkflowId: w.vapi_workflow_id || undefined,
    syncStatus: "idle",
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}

export function mapDjangoNotionIntegration(i: DjangoNotion): NotionIntegration {
  return {
    id: i.id,
    kind: "notion",
    label: i.label,
    databaseId: i.database_id,
    dataSourceId: i.data_source_id,
    databaseTitle: "",
    fieldMap: i.field_mappings ?? [],
    token: "",
    vapiTools: i.vapi_tools ?? [],
    syncStatus: "idle",
    createdAt: i.created_at,
  };
}

/**
 * Pull workflows + Notion integrations (needs auth + `X-Org-Id` in sessionStorage).
 * Uses `Promise.allSettled` so a flaky list (CORS, wrong host, offline) does not
 * block login/register — the account is already valid if tokens were issued.
 */
export async function hydrateStoresFromDjango(): Promise<void> {
  clearClientStores();

  const [wfResult, notionResult, agentsResult] = await Promise.allSettled([
    apiFetch<DjangoWorkflow[]>("/api/v1/workflows/"),
    apiFetch<DjangoNotion[]>("/api/v1/integrations/notion/"),
    fetchOrgAgentsFromApi(),
  ]);

  if (wfResult.status === "fulfilled") {
    replaceAllWorkflows(wfResult.value.map(mapWorkflow));
  } else {
    replaceAllWorkflows([]);
  }

  if (notionResult.status === "fulfilled") {
    replaceAllIntegrations(notionResult.value.map(mapDjangoNotionIntegration));
  } else {
    replaceAllIntegrations([]);
  }

  if (agentsResult.status === "fulfilled") {
    const { ok, agents } = agentsResult.value;
    applyAgentsHydrate({
      agents,
      remote: ok,
      apiAgentsLoadFailed: !ok,
    });
  } else {
    applyAgentsHydrate({
      agents: [],
      remote: false,
      apiAgentsLoadFailed: true,
    });
  }
}
