import { apiFetch } from "@/lib/api/client";
import { hasBackendApi } from "@/lib/api/env";

/** Client messages required for live workflow canvas + transcript during test calls. */
export const WORKFLOW_TEST_CLIENT_MESSAGES = [
  "transcript",
  "workflow.node.started",
  "status-update",
] as const;

export type WorkflowWebCallConfig =
  | { publicKey: string; workflowId: string }
  | { error: string };

type WorkflowTestClientMessage =
  | "transcript"
  | "workflow.node.started"
  | "status-update";

export function workflowTestStartOverrides(): {
  clientMessages: WorkflowTestClientMessage[];
} {
  return {
    clientMessages: [
      "transcript",
      "workflow.node.started",
      "status-update",
    ],
  };
}

export function isBenignDailyTeardown(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const o = e as Record<string, unknown>;
  if (o.type !== "daily-error") return false;
  const inner = o.error;
  const msg =
    inner && typeof inner === "object" && "message" in inner
      ? String((inner as { message: string }).message)
      : typeof inner === "string"
        ? inner
        : "";
  return /meeting has ended|meeting ended in error/i.test(msg);
}

export async function safeStopVapi(
  client: { stop: () => Promise<unknown> } | null,
): Promise<void> {
  if (!client) return;
  try {
    await client.stop();
  } catch {
    /* join/destroy races */
  }
}

export async function resolveWebCallForWorkflow(
  workflowRecordId: string,
): Promise<WorkflowWebCallConfig> {
  const id = workflowRecordId.trim();
  if (!id) {
    return { error: "This workflow is not saved on the server yet." };
  }
  const fromEnv = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() ?? "";
  if (!hasBackendApi()) {
    return {
      error:
        "Set NEXT_PUBLIC_API_BASE_URL and sign in so the server can resolve this workflow.",
    };
  }
  try {
    const cfg = await apiFetch<{
      publicKey: string;
      assistantId: string | null;
      workflowId: string | null;
    }>("/api/v1/calls/web-config/", {
      method: "POST",
      json: { workflow_id: id },
    });
    const pk = (cfg.publicKey || fromEnv).trim();
    if (!pk) {
      return {
        error:
          "Voice is not configured on the server (VAPI_PUBLIC_KEY). Contact your workspace admin.",
      };
    }
    const wid = (cfg.workflowId ?? "").trim();
    if (!wid) {
      return {
        error:
          "This workflow is not synced to voice yet. Save and sync to Vapi first.",
      };
    }
    return { publicKey: pk, workflowId: wid };
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Could not load voice config. Sign in and confirm your organization is selected.",
    };
  }
}
