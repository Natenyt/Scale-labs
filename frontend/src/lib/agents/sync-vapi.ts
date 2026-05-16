import { apiFetch } from "@/lib/api/client";

export type AgentSyncVapiResponse = {
  ok: boolean;
  vapiAssistantId: string;
  vapi?: unknown;
  error?: string;
  detail?: unknown;
};

export async function syncAgentToVapi(agentId: string): Promise<AgentSyncVapiResponse> {
  return apiFetch<AgentSyncVapiResponse>(`/api/v1/agents/${agentId}/sync-vapi/`, {
    method: "POST",
    json: {},
  });
}
