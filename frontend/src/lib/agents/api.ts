import { baseAgent, type Agent, type Language } from "@/lib/agents/types";

export type ApiAgentRow = {
  id: string;
  name: string;
  config: Record<string, unknown> | null;
  vapi_assistant_id?: string;
  /** Some gateways/clients camelCase JSON; accept either. */
  vapiAssistantId?: string;
  created_at: string;
};

function vapiAssistantIdFromApiRow(row: ApiAgentRow): string | null {
  const a = row.vapi_assistant_id;
  const b = row.vapiAssistantId;
  const s = (typeof a === "string" ? a : typeof b === "string" ? b : "")
    .trim();
  return s || null;
}

/** Strip server-owned fields before persisting `config` on the Agent row. */
export function toApiConfig(agent: Agent): Record<string, unknown> {
  const { id, name, vapiAssistantId, createdAt, ...rest } = agent;
  void id;
  void name;
  void vapiAssistantId;
  void createdAt;
  return { ...rest } as Record<string, unknown>;
}

export function fromApiAgentRow(row: ApiAgentRow): Agent {
  const raw = row.config && typeof row.config === "object" ? row.config : {};
  const cfg = { ...raw } as Partial<Agent> & Record<string, unknown>;
  delete cfg.id;
  delete cfg.name;
  delete (cfg as { vapiAssistantId?: unknown }).vapiAssistantId;
  delete (cfg as { createdAt?: unknown }).createdAt;

  const language = (cfg.language as Language | undefined) ?? "en";

  return baseAgent({
    language,
    ...cfg,
    id: row.id,
    name: row.name,
    vapiAssistantId: vapiAssistantIdFromApiRow(row),
    createdAt: row.created_at,
  });
}
