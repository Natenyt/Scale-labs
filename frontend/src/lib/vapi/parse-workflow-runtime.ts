/**
 * Parse Vapi Web SDK messages that drive live workflow canvas highlighting.
 */

export type WorkflowRuntimeUpdate = {
  activeNodeId: string;
};

function readNodeId(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const o = node as Record<string, unknown>;
  if (typeof o.name === "string" && o.name.trim()) return o.name.trim();
  if (typeof o.id === "string" && o.id.trim()) return o.id.trim();
  return null;
}

export function parseWorkflowRuntimeMessage(
  raw: unknown,
): WorkflowRuntimeUpdate | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const type = typeof o.type === "string" ? o.type : "";
  if (type !== "workflow.node.started") return null;

  const fromNode = readNodeId(o.node);
  if (fromNode) return { activeNodeId: fromNode };

  const nested = o.workflow;
  if (nested && typeof nested === "object") {
    const fromNested = readNodeId((nested as Record<string, unknown>).node);
    if (fromNested) return { activeNodeId: fromNested };
  }

  return null;
}
