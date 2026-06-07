/**
 * Compile a local `Workflow` into the Vapi REST shape.
 *
 * The shape used here was reverse-engineered against `POST /workflow` on the
 * live Vapi API (May 2026) and cross-checked against a real workflow JSON
 * exported from the Vapi dashboard. The public OpenAPI spec at
 * api.vapi.ai/api-json does NOT publish the `/workflow` paths, and the
 * marketing docs are stale — everything below is what the live `BadRequest`
 * validator actually accepts.
 *
 * Key facts (validated by smoke tests):
 *
 * - Nodes are identified by `name` (string). `id` is rejected outright.
 * - The start node must have `isStart: true`. Just naming it "start" is not
 *   enough.
 * - Allowed node `type`s: `conversation`, `tool`, `assistant`, `start`, `say`,
 *   `gather`, `end`, `hangup`, `apiRequest`, `transfer`. We use a subset.
 * - Conversation nodes use `prompt` (not `systemPrompt`). A first-spoken line
 *   goes in `messagePlan: { firstMessage }` — NOT as a top-level `firstMessage`.
 * - Variable extraction is `variableExtractionPlan.output[].{ title, type,
 *   description, enum? }`. The legacy `extractVariables[]` shape is rejected.
 * - Tools available to a conversation node go in a top-level `toolIds: string[]`
 *   array (the LLM picks during the turn). A standalone Tool node uses
 *   `{ type: "tool", name, toolId }` and forces a single call.
 * - Global nodes use `globalNodePlan: { enabled: true, enterCondition }`. The
 *   legacy `isGlobal` flag is rejected.
 * - Transfer destination must be an object: `{ type: "number", number: "..." }`.
 * - API request nodes must include `mode: "blocking" | "background"`.
 * - End nodes are silent terminals — no message, no prompt.
 * - Canvas position lives at `node.metadata.position`. Vapi round-trips it so
 *   the dashboard layout stays in sync with ours.
 * - Top-level optional `globalPrompt` applies system-wide tone/guard-rails.
 * - Edges reference node `name`s via `from` / `to`. `condition` is an object:
 *     - AI condition:    `{ type: "ai",    prompt: "User wants ..." }`
 *     - Logic condition: `{ type: "logic", liquid: "{{ intent == ... }}" }`
 *   We pick `logic` if the user-supplied condition contains `{{ ... }}`,
 *   otherwise `ai`.
 */

import type { VapiWorkflowPayload } from "@/lib/vapi/server";

import type {
  ExtractVariable,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from "./types";

// ---------------------------------------------------------------------------
// Vapi node shapes
// ---------------------------------------------------------------------------

type VapiVariableExtractionPlan = {
  output: {
    title: string;
    type: "string" | "number" | "boolean" | "integer";
    description: string;
    enum?: string[];
  }[];
};

type VapiGlobalNodePlan = {
  enabled: true;
  enterCondition: string;
};

type VapiMessagePlan = {
  firstMessage: string;
};

type VapiNodeMetadata = {
  position: { x: number; y: number };
};

type VapiConversationNode = {
  type: "conversation";
  name: string;
  prompt: string;
  isStart?: true;
  metadata?: VapiNodeMetadata;
  messagePlan?: VapiMessagePlan;
  variableExtractionPlan?: VapiVariableExtractionPlan;
  toolIds?: string[];
  globalNodePlan?: VapiGlobalNodePlan;
};

type VapiToolNode = {
  type: "tool";
  name: string;
  toolId: string;
  metadata?: VapiNodeMetadata;
  globalNodePlan?: VapiGlobalNodePlan;
};

/** Vapi dashboard built-in transfer tool (no E.164 on the node). */
type VapiBuiltinTransferToolNode = {
  type: "tool";
  name: string;
  metadata?: VapiNodeMetadata;
  globalNodePlan?: VapiGlobalNodePlan;
  tool: {
    type: "transferCall";
    function: {
      name: string;
      parameters: {
        type: "object";
        required: string[];
        properties: Record<string, never>;
      };
    };
    destinations: unknown[];
  };
};

type VapiTransferNode = {
  type: "transfer";
  name: string;
  destination: { type: "number"; number: string };
  metadata?: VapiNodeMetadata;
  globalNodePlan?: VapiGlobalNodePlan;
};

type VapiEndNode = {
  type: "end";
  name: string;
  metadata?: VapiNodeMetadata;
};

type VapiApiRequestNode = {
  type: "apiRequest";
  name: string;
  method: "GET" | "POST";
  url: string;
  mode: "blocking" | "background";
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  metadata?: VapiNodeMetadata;
  globalNodePlan?: VapiGlobalNodePlan;
};

export type VapiNode =
  | VapiConversationNode
  | VapiToolNode
  | VapiBuiltinTransferToolNode
  | VapiTransferNode
  | VapiEndNode
  | VapiApiRequestNode;

type VapiEdgeCondition =
  | { type: "ai"; prompt: string }
  | { type: "logic"; liquid: string };

export type VapiEdge = {
  from: string;
  to: string;
  condition?: VapiEdgeCondition;
};

// ---------------------------------------------------------------------------
// Compile result
// ---------------------------------------------------------------------------

export type CompileError = {
  code:
    | "NO_START"
    | "MULTIPLE_STARTS"
    | "TOOL_REF_MISSING"
    | "EDGE_DANGLING"
    | "UNREACHABLE_NODE"
    | "MISSING_FIELD"
    | "INVALID_GLOBAL"
    | "DUPLICATE_NAME";
  message: string;
  nodeId?: string;
  edgeId?: string;
};

export type CompileResult =
  | { ok: true; payload: VapiWorkflowPayload; errors: [] }
  | { ok: false; payload: null; errors: CompileError[] };

export type CompileOptions = {
  /** Set of `VapiToolRef.id` values currently registered across integrations. */
  availableVapiToolIds?: Set<string>;
};

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapVariableExtractionPlan(
  vars: ExtractVariable[] | undefined,
): VapiVariableExtractionPlan | undefined {
  if (!vars || vars.length === 0) return undefined;
  return {
    output: vars.map((v) => ({
      title: v.name,
      type: v.type,
      description: v.description,
      enum:
        v.enumValues && v.enumValues.length > 0 ? v.enumValues : undefined,
    })),
  };
}

function mapGlobalNodePlan(
  node: WorkflowNode,
): VapiGlobalNodePlan | undefined {
  if (node.kind === "start") return undefined;
  if (!node.isGlobal) return undefined;
  const cond = (node.enterCondition ?? "").trim();
  if (!cond) return undefined;
  return { enabled: true, enterCondition: cond };
}

function mapEdgeCondition(raw: string | undefined): VapiEdgeCondition | undefined {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return undefined;
  // Liquid expressions go to the logic engine; everything else is AI guidance.
  if (/\{\{[\s\S]*\}\}/.test(trimmed)) {
    return { type: "logic", liquid: trimmed };
  }
  return { type: "ai", prompt: trimmed };
}

function mapMessagePlan(
  firstMessage: string | undefined,
): VapiMessagePlan | undefined {
  const opener = (firstMessage ?? "").trim();
  if (!opener) return undefined;
  return { firstMessage: opener };
}

function mapToolIds(refs: WorkflowNode["attachedTools"]): string[] | undefined {
  if (!refs || refs.length === 0) return undefined;
  const ids = refs
    .map((r) => r.vapiToolId)
    .filter((id): id is string => Boolean(id));
  return ids.length > 0 ? Array.from(new Set(ids)) : undefined;
}

function mapMetadata(node: WorkflowNode): VapiNodeMetadata {
  return {
    position: {
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
    },
  };
}

function mapNode(node: WorkflowNode): VapiNode {
  // Use the local node id as the Vapi node name — already unique per workflow
  // ("start" or a generated slug).
  const name = node.id;
  const globalNodePlan = mapGlobalNodePlan(node);
  const metadata = mapMetadata(node);

  switch (node.kind) {
    case "start": {
      const out: VapiConversationNode = {
        type: "conversation",
        name,
        prompt: (node.systemPrompt ?? "").trim(),
        isStart: true,
        metadata,
      };
      const messagePlan = mapMessagePlan(node.firstMessage);
      if (messagePlan) out.messagePlan = messagePlan;
      const xv = mapVariableExtractionPlan(node.extractVariables);
      if (xv) out.variableExtractionPlan = xv;
      const toolIds = mapToolIds(node.attachedTools);
      if (toolIds) out.toolIds = toolIds;
      return out;
    }
    case "conversation": {
      const out: VapiConversationNode = {
        type: "conversation",
        name,
        prompt: (node.systemPrompt ?? "").trim(),
        metadata,
      };
      const messagePlan = mapMessagePlan(node.firstMessage);
      if (messagePlan) out.messagePlan = messagePlan;
      const xv = mapVariableExtractionPlan(node.extractVariables);
      if (xv) out.variableExtractionPlan = xv;
      const toolIds = mapToolIds(node.attachedTools);
      if (toolIds) out.toolIds = toolIds;
      if (globalNodePlan) out.globalNodePlan = globalNodePlan;
      return out;
    }
    case "tool": {
      const out: VapiToolNode = {
        type: "tool",
        name,
        toolId: node.toolRef?.vapiToolId ?? "",
        metadata,
      };
      if (globalNodePlan) out.globalNodePlan = globalNodePlan;
      return out;
    }
    case "transfer_call": {
      const number = (node.destination ?? "").trim();
      if (!number) {
        const out: VapiBuiltinTransferToolNode = {
          type: "tool",
          name,
          metadata,
          tool: {
            type: "transferCall",
            function: {
              name: "transfer_call",
              parameters: {
                type: "object",
                required: [],
                properties: {},
              },
            },
            destinations: [],
          },
        };
        if (globalNodePlan) out.globalNodePlan = globalNodePlan;
        return out;
      }
      const out: VapiTransferNode = {
        type: "transfer",
        name,
        destination: {
          type: "number",
          number,
        },
        metadata,
      };
      if (globalNodePlan) out.globalNodePlan = globalNodePlan;
      return out;
    }
    case "end_call": {
      return { type: "end", name, metadata };
    }
    case "api_request": {
      const cfg = node.apiRequest;
      const out: VapiApiRequestNode = {
        type: "apiRequest",
        name,
        method: cfg?.method ?? "GET",
        url: (cfg?.url ?? "").trim(),
        // Default to blocking — users typically want the result back in the
        // same turn. Background fire-and-forget can be a v2 toggle.
        mode: "blocking",
        metadata,
      };
      if (cfg?.headers && Object.keys(cfg.headers).length > 0) {
        out.headers = cfg.headers;
      }
      if (cfg?.body && Object.keys(cfg.body).length > 0) {
        out.body = cfg.body;
      }
      if (globalNodePlan) out.globalNodePlan = globalNodePlan;
      return out;
    }
  }
}

function mapEdge(edge: WorkflowEdge): VapiEdge {
  const out: VapiEdge = { from: edge.from, to: edge.to };
  const condition = mapEdgeCondition(edge.condition);
  if (condition) out.condition = condition;
  return out;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

function validate(
  workflow: Workflow,
  options: CompileOptions,
): CompileError[] {
  const errors: CompileError[] = [];
  const nodeIds = new Set(workflow.nodes.map((n) => n.id));
  const starts = workflow.nodes.filter((n) => n.kind === "start");

  if (starts.length === 0) {
    errors.push({
      code: "NO_START",
      message:
        "Add a Start node — every workflow needs exactly one entry point.",
    });
  } else if (starts.length > 1) {
    errors.push({
      code: "MULTIPLE_STARTS",
      message: "Only one Start node is allowed per workflow.",
      nodeId: starts[1]!.id,
    });
  }

  // Vapi enforces unique node `name`s; our ids are already unique by store
  // construction, but double-check in case someone edited localStorage.
  const seen = new Set<string>();
  for (const n of workflow.nodes) {
    if (seen.has(n.id)) {
      errors.push({
        code: "DUPLICATE_NAME",
        message: `Duplicate node id "${n.id}" — node ids must be unique within a workflow.`,
        nodeId: n.id,
      });
    }
    seen.add(n.id);
  }

  for (const node of workflow.nodes) {
    if (node.kind === "start" && node.isGlobal) {
      errors.push({
        code: "INVALID_GLOBAL",
        message: "Start node cannot be marked global.",
        nodeId: node.id,
      });
    }
    if (node.isGlobal && node.kind !== "start") {
      if (!node.enterCondition || node.enterCondition.trim().length === 0) {
        errors.push({
          code: "MISSING_FIELD",
          message: "Global nodes must have an entry condition.",
          nodeId: node.id,
        });
      }
    }
    if (node.kind === "tool") {
      const id = node.toolRef?.vapiToolId;
      if (!id) {
        errors.push({
          code: "TOOL_REF_MISSING",
          message: "Pick a workflow tool for this Tool node.",
          nodeId: node.id,
        });
      } else if (
        options.availableVapiToolIds &&
        !options.availableVapiToolIds.has(id)
      ) {
        errors.push({
          code: "TOOL_REF_MISSING",
          message:
            "This Tool node references a tool that is no longer registered. Resync your integration and pick again.",
          nodeId: node.id,
        });
      }
    }
    // transfer_call without destination compiles to Vapi's built-in transferCall tool.
    if (node.kind === "api_request") {
      if (!node.apiRequest?.url || node.apiRequest.url.trim().length === 0) {
        errors.push({
          code: "MISSING_FIELD",
          message: "API request node needs a URL.",
          nodeId: node.id,
        });
      }
    }
    if (node.kind === "conversation" || node.kind === "start") {
      const prompt = (node.systemPrompt ?? "").trim();
      const firstMessage = (node.firstMessage ?? "").trim();
      if (prompt.length === 0 && firstMessage.length === 0) {
        errors.push({
          code: "MISSING_FIELD",
          message:
            "Conversation nodes need either a first message or a prompt.",
          nodeId: node.id,
        });
      }
    }
  }

  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      errors.push({
        code: "EDGE_DANGLING",
        message: "Edge points to a node that no longer exists.",
        edgeId: edge.id,
      });
    }
  }

  // Unreachable analysis: from start, BFS over forward edges.
  if (starts.length === 1) {
    const startId = starts[0]!.id;
    const adjacency = new Map<string, string[]>();
    for (const edge of workflow.edges) {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
      const arr = adjacency.get(edge.from) ?? [];
      arr.push(edge.to);
      adjacency.set(edge.from, arr);
    }
    const visited = new Set<string>();
    const enqueueFrom = (originId: string) => {
      if (!nodeIds.has(originId) || visited.has(originId)) return;
      const queue: string[] = [originId];
      visited.add(originId);
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const next of adjacency.get(current) ?? []) {
          if (!visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        }
      }
    };
    enqueueFrom(startId);
    for (const node of workflow.nodes) {
      if (node.isGlobal) enqueueFrom(node.id);
    }
    for (const node of workflow.nodes) {
      if (node.isGlobal) continue;
      if (!visited.has(node.id)) {
        errors.push({
          code: "UNREACHABLE_NODE",
          message: `"${node.label ?? node.kind}" is not reachable from Start.`,
          nodeId: node.id,
        });
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function compileToVapiPayload(
  workflow: Workflow,
  options: CompileOptions = {},
): CompileResult {
  const errors = validate(workflow, options);
  if (errors.length > 0) {
    return { ok: false, payload: null, errors };
  }
  const payload: VapiWorkflowPayload = {
    name: workflow.name.trim() || "Untitled workflow",
    nodes: workflow.nodes.map(mapNode),
    edges: workflow.edges.map(mapEdge),
    // Low-latency defaults so browser/phone calls don't lag: Vapi native voice
    // (no external TTS hop), a fast LLM, and fast STT. Without these Vapi falls
    // back to slower defaults.
    voice: { provider: "vapi", voiceId: "Elliot" },
    model: { provider: "openai", model: "gpt-4o-mini" },
    transcriber: { provider: "deepgram", model: "nova-3", language: "en" },
  };
  const globalPrompt = (workflow.globalPrompt ?? "").trim();
  if (globalPrompt) {
    payload.globalPrompt = globalPrompt;
  }
  return { ok: true, payload, errors: [] };
}
