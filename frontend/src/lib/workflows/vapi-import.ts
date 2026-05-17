/**
 * Import a Vapi workflow export into the Scale Labs canvas model.
 * Inverse of `vapi-compile.ts`.
 */

import type { VapiWorkflowPayload } from "@/lib/vapi/server";

import { DEFAULT_NODE_POSITION } from "./types";
import type {
  ExtractVariable,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeKind,
} from "./types";

export type ImportedWorkflow = {
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  globalPrompt?: string;
};

type VapiVariableOutput = {
  title?: string;
  type?: ExtractVariable["type"];
  description?: string;
  enum?: string[];
};

type VapiNode = {
  name?: string;
  type?: string;
  isStart?: boolean;
  prompt?: string;
  metadata?: { position?: { x?: number; y?: number } };
  messagePlan?: { firstMessage?: string };
  variableExtractionPlan?: { output?: VapiVariableOutput[] };
  globalNodePlan?: { enabled?: boolean; enterCondition?: string };
  toolId?: string;
  tool?: {
    type?: string;
    destinations?: { number?: string; type?: string }[];
    messages?: { type?: string; content?: string; blocking?: boolean }[];
  };
  destination?: { type?: string; number?: string };
  method?: "GET" | "POST";
  url?: string;
  mode?: "blocking" | "background";
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
};

type VapiEdge = {
  from?: string;
  to?: string;
  condition?: { type?: string; prompt?: string; liquid?: string };
};

function positionOf(node: VapiNode): { x: number; y: number } {
  const p = node.metadata?.position;
  if (
    p &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  ) {
    return { x: p.x, y: p.y };
  }
  return { ...DEFAULT_NODE_POSITION };
}

function mapExtractVariables(
  output: VapiVariableOutput[] | undefined,
): ExtractVariable[] | undefined {
  if (!output?.length) return undefined;
  return output.map((v) => ({
    name: (v.title ?? "").trim() || "field",
    type: v.type ?? "string",
    description: (v.description ?? "").trim(),
    enumValues: v.enum?.length ? v.enum : undefined,
  }));
}

function endCallMessage(node: VapiNode): string | undefined {
  const messages = node.tool?.messages;
  if (!messages?.length) return undefined;
  const start = messages.find((m) => m.type === "request-start");
  return start?.content?.trim() || undefined;
}

function transferDestination(node: VapiNode): string | undefined {
  const fromTool = node.tool?.destinations?.[0]?.number;
  if (fromTool?.trim()) return fromTool.trim();
  if (node.destination?.number?.trim()) return node.destination.number.trim();
  return undefined;
}

function mapNode(node: VapiNode): WorkflowNode | null {
  const name = (node.name ?? "").trim();
  if (!name) return null;

  const base = {
    id: name,
    position: positionOf(node),
    label: name,
  };

  const globalPlan = node.globalNodePlan;
  const isGlobal = Boolean(globalPlan?.enabled);
  const enterCondition = globalPlan?.enterCondition?.trim() || undefined;

  if (node.type === "conversation") {
    const kind: WorkflowNodeKind = node.isStart ? "start" : "conversation";
    return {
      ...base,
      kind,
      firstMessage: node.messagePlan?.firstMessage?.trim() || undefined,
      systemPrompt: node.prompt?.trim() || undefined,
      extractVariables: mapExtractVariables(
        node.variableExtractionPlan?.output,
      ),
      isGlobal: kind === "start" ? undefined : isGlobal || undefined,
      enterCondition: kind === "start" ? undefined : enterCondition,
    };
  }

  if (node.type === "tool") {
    const toolType = node.tool?.type;
    if (toolType === "transferCall") {
      return {
        ...base,
        kind: "transfer_call",
        destination: transferDestination(node),
        isGlobal: isGlobal || undefined,
        enterCondition,
      };
    }
    if (toolType === "endCall") {
      return {
        ...base,
        kind: "end_call",
        transferMessage: endCallMessage(node),
        isGlobal: isGlobal || undefined,
        enterCondition,
      };
    }
    if (node.toolId) {
      return {
        ...base,
        kind: "tool",
        toolRef: {
          vapiToolId: node.toolId,
          label: name,
        },
        isGlobal: isGlobal || undefined,
        enterCondition,
      };
    }
    return {
      ...base,
      kind: "tool",
      isGlobal: isGlobal || undefined,
      enterCondition,
    };
  }

  if (node.type === "transfer") {
    return {
      ...base,
      kind: "transfer_call",
      destination: transferDestination(node),
      isGlobal: isGlobal || undefined,
      enterCondition,
    };
  }

  if (node.type === "end" || node.type === "hangup") {
    return {
      ...base,
      kind: "end_call",
      isGlobal: isGlobal || undefined,
      enterCondition,
    };
  }

  if (node.type === "apiRequest") {
    return {
      ...base,
      kind: "api_request",
      apiRequest: {
        method: node.method ?? "GET",
        url: (node.url ?? "").trim(),
        headers: node.headers,
        body: node.body,
      },
      isGlobal: isGlobal || undefined,
      enterCondition,
    };
  }

  return null;
}

function mapEdgeCondition(
  condition: VapiEdge["condition"],
): string | undefined {
  if (!condition) return undefined;
  if (condition.type === "logic" && condition.liquid?.trim()) {
    return condition.liquid.trim();
  }
  if (condition.prompt?.trim()) {
    return condition.prompt.trim();
  }
  return undefined;
}

function mapEdges(edges: VapiEdge[]): WorkflowEdge[] {
  const seen = new Map<string, number>();
  return edges
    .filter((e) => e.from?.trim() && e.to?.trim())
    .map((e) => {
      const from = e.from!.trim();
      const to = e.to!.trim();
      const key = `${from}->${to}`;
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      const id = n === 0 ? `e_${from}_${to}` : `e_${from}_${to}_${n}`;
      return {
        id,
        from,
        to,
        condition: mapEdgeCondition(e.condition),
      };
    });
}

export function importVapiWorkflow(
  payload: VapiWorkflowPayload,
): ImportedWorkflow {
  const vapiNodes = (payload.nodes ?? []) as VapiNode[];
  const nodes = vapiNodes
    .map(mapNode)
    .filter((n): n is WorkflowNode => n !== null);

  const edges = mapEdges((payload.edges ?? []) as VapiEdge[]);

  const globalPrompt = (payload.globalPrompt ?? "").trim() || undefined;

  return {
    name: (payload.name ?? "").trim() || "Untitled workflow",
    nodes,
    edges,
    globalPrompt,
  };
}
