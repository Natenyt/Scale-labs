/**
 * Local workflow model.
 *
 * This is the *Scale Labs* shape — designed for the React Flow canvas. The
 * compiler in `vapi-compile.ts` translates it into the Vapi REST shape at
 * sync time. Position is canvas-only and never sent to Vapi.
 *
 * v1 node kinds (per plan):
 *   - `start`         (compiled to a `conversation` node with id="start")
 *   - `conversation`
 *   - `tool`          (references a Vapi tool already in the workspace library)
 *   - `transfer_call`
 *   - `end_call`
 *   - `api_request`
 *
 * Any non-start node can be marked `isGlobal` with an `enterCondition`.
 */

export type WorkflowNodeKind =
  | "start"
  | "conversation"
  | "tool"
  | "transfer_call"
  | "end_call"
  | "api_request";

export const WORKFLOW_NODE_KINDS: WorkflowNodeKind[] = [
  "start",
  "conversation",
  "tool",
  "transfer_call",
  "end_call",
  "api_request",
];

/** Human labels for the palette / inspector. */
export const WORKFLOW_NODE_LABELS: Record<
  WorkflowNodeKind,
  { name: string; description: string }
> = {
  start: {
    name: "Start",
    description:
      "Entry point. Compiled to a Vapi conversation node with id=start.",
  },
  conversation: {
    name: "Conversation",
    description:
      "Speak to the caller, optionally extract variables for later branching.",
  },
  tool: {
    name: "Tool",
    description:
      "Call a tool from the Vapi library — for example one of your Notion connection tools.",
  },
  transfer_call: {
    name: "Transfer call",
    description: "Hand off the live call to a phone number or human agent.",
  },
  end_call: {
    name: "End call",
    description: "Terminal node. Optional closing line before hangup.",
  },
  api_request: {
    name: "API request",
    description: "Make an HTTP request to your own endpoint mid-call.",
  },
};

export type ExtractVariable = {
  name: string;
  type: "string" | "number" | "boolean" | "integer";
  description: string;
  /** Constrain string-type variables to a fixed set (for reliable branching). */
  enumValues?: string[];
};

export type ToolRef = {
  /** Vapi-side tool id (`VapiToolRef.id`). */
  vapiToolId: string;
  /** Originating Scale Labs integration id (informational). */
  integrationId?: string;
  /** Human label shown in the inspector and on the node. */
  label: string;
};

export type ApiRequestConfig = {
  method: "GET" | "POST";
  url: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
};

export type WorkflowNode = {
  id: string;
  kind: WorkflowNodeKind;
  /**
   * Canvas position. Sent to Vapi as `metadata.position` so it round-trips
   * with the dashboard.
   */
  position: { x: number; y: number };
  /** Friendly label shown in the canvas. Falls back to a kind-default. */
  label?: string;
  /** Promote this node to a Vapi global node (`globalNodePlan.enabled`). Not legal on `start`. */
  isGlobal?: boolean;
  /** Entry condition for a global node. Required when `isGlobal`. */
  enterCondition?: string;
  // ---- conversation / start ----
  /**
   * First spoken line for the node. Compiled to `messagePlan.firstMessage`
   * — Vapi supports it as a separate field; we do NOT bake it into the prompt.
   */
  firstMessage?: string;
  systemPrompt?: string;
  extractVariables?: ExtractVariable[];
  /**
   * Tools the LLM can call mid-turn while this conversation node is active.
   * Compiled to `toolIds: [...]` on the node. Distinct from a standalone
   * `tool` node (which uses `toolRef` and forces a single call).
   */
  attachedTools?: ToolRef[];
  // ---- tool (standalone) ----
  toolRef?: ToolRef;
  // ---- transfer_call ----
  destination?: string;
  transferMessage?: string;
  // ---- api_request ----
  apiRequest?: ApiRequestConfig;
};

export type WorkflowEdge = {
  id: string;
  from: string;
  to: string;
  /**
   * Optional branching condition. Either AI text ("User wants to schedule")
   * or a liquid expression (`{{ intent == "schedule" }}`).
   */
  condition?: string;
};

export type WorkflowSyncStatus = "idle" | "syncing" | "synced" | "error";

export type Workflow = {
  id: string;
  name: string;
  description?: string;
  /**
   * Optional workflow-wide system prompt sent as Vapi `globalPrompt`. Useful
   * for tone/guard-rails that apply across every conversation node.
   */
  globalPrompt?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  /** Set after a successful POST /workflow on Vapi. */
  vapiWorkflowId?: string;
  syncStatus?: WorkflowSyncStatus;
  lastSyncError?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** Default position for a freshly-dropped node. */
export const DEFAULT_NODE_POSITION = { x: 240, y: 160 } as const;
