/** A squad is a team of agents that hand off to each other mid-call. */

export type SquadGraphNode = {
  id: string;
  /** Org agent external id (`ag_*`). */
  agentId: string;
  /** Authoritative name snapshot written by the server on save. */
  agentName?: string;
  vapiAssistantId?: string;
  position: { x: number; y: number };
  isStart?: boolean;
};

export type SquadGraphEdge = {
  id: string;
  source: string;
  target: string;
  /** Natural-language handoff condition ("hand off when…"). */
  condition: string;
};

export type SquadGraph = {
  nodes: SquadGraphNode[];
  edges: SquadGraphEdge[];
};

export type SquadRow = {
  /** External id (`sq_*`). */
  id: string;
  name: string;
  graph: SquadGraph;
  vapi_squad_id: string;
  created_at: string;
  updated_at: string;
};

export const EMPTY_GRAPH: SquadGraph = { nodes: [], edges: [] };
