import { fromApiAgentRow, type ApiAgentRow } from "@/lib/agents/api";
import type { Agent } from "@/lib/agents/types";
import { apiFetch } from "@/lib/api/client";

/** After create, guarantee `vapiAssistantId` from the server (refetch if POST omitted it). */
export async function ensureAgentVoiceLinked(row: ApiAgentRow): Promise<Agent> {
  let agent = fromApiAgentRow(row);
  if ((agent.vapiAssistantId ?? "").trim()) {
    return agent;
  }
  const id = row.id?.trim();
  if (!id || !/^ag_\d+$/.test(id)) {
    throw new Error("Agent was saved but has no voice link. Check server VAPI_API_KEY.");
  }
  const refreshed = await apiFetch<ApiAgentRow>(`/api/v1/agents/${id}/`);
  agent = fromApiAgentRow(refreshed);
  if (!(agent.vapiAssistantId ?? "").trim()) {
    throw new Error(
      "Voice assistant was not provisioned. Check VAPI_API_KEY on the server and try again.",
    );
  }
  return agent;
}
