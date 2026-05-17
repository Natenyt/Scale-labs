/**
 * Parse Vapi `tool-calls` webhook bodies (see docs.vapi.ai/tools/custom-tools).
 */
export function parseVapiToolCall(body: {
  message?: Record<string, unknown>;
}): { toolCallId: string; args: Record<string, unknown> } | null {
  const message = body.message;
  if (!message || typeof message !== "object") return null;

  const fromRaw = (raw: Record<string, unknown>) => {
    const toolCallId = String(raw.id ?? raw.toolCallId ?? "");
    if (!toolCallId) return null;
    const fn =
      typeof raw.function === "object" && raw.function
        ? (raw.function as Record<string, unknown>)
        : {};
    const argsRaw =
      raw.arguments ??
      raw.parameters ??
      fn.arguments ??
      fn.parameters;
    let args: Record<string, unknown> = {};
    if (typeof argsRaw === "string" && argsRaw.trim()) {
      args = JSON.parse(argsRaw) as Record<string, unknown>;
    } else if (argsRaw && typeof argsRaw === "object") {
      args = argsRaw as Record<string, unknown>;
    }
    return { toolCallId, args };
  };

  const toolCallList = message.toolCallList;
  if (Array.isArray(toolCallList) && toolCallList[0]) {
    const parsed = fromRaw(toolCallList[0] as Record<string, unknown>);
    if (parsed) return parsed;
  }

  const toolWithToolCallList = message.toolWithToolCallList;
  if (Array.isArray(toolWithToolCallList) && toolWithToolCallList[0]) {
    const entry = toolWithToolCallList[0] as Record<string, unknown>;
    const nested = entry.toolCall;
    if (nested && typeof nested === "object") {
      const parsed = fromRaw(nested as Record<string, unknown>);
      if (parsed) return parsed;
    }
  }

  const toolCalls = (message.toolCalls ?? message.tool_calls) as
    | unknown[]
    | undefined;
  if (Array.isArray(toolCalls) && toolCalls[0]) {
    const parsed = fromRaw(toolCalls[0] as Record<string, unknown>);
    if (parsed) return parsed;
  }

  return null;
}
