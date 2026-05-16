import { fromApiAgentRow, type ApiAgentRow } from "@/lib/agents/api";
import { apiFetch } from "@/lib/api/client";
import { hasBackendApi } from "@/lib/api/env";
import { getAccessToken } from "@/lib/api/tokens";

/** Load org agents from Django (requires JWT + X-Org-Id). */
export async function fetchOrgAgentsFromApi(): Promise<{
  ok: boolean;
  agents: ReturnType<typeof fromApiAgentRow>[];
}> {
  if (!hasBackendApi() || !getAccessToken()?.trim()) {
    return { ok: false, agents: [] };
  }
  try {
    const rows = await apiFetch<ApiAgentRow[]>("/api/v1/agents/");
    return { ok: true, agents: (rows ?? []).map(fromApiAgentRow) };
  } catch {
    return { ok: false, agents: [] };
  }
}
