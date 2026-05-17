/**
 * Browser-side helper for workflow → Vapi sync.
 * Uses Django when `NEXT_PUBLIC_API_BASE_URL` is set, otherwise the Next.js BFF route.
 */

import { toast } from "sonner";

import { apiFetch } from "@/lib/api/client";
import { hasBackendApi } from "@/lib/api/env";

import type { VapiWorkflowPayload } from "@/lib/vapi/server";

import { compileToVapiPayload, type CompileError } from "./vapi-compile";
import type { Workflow, WorkflowSyncStatus } from "./types";

export type WorkflowSyncMutators = {
  setSyncStatus: (
    id: string,
    status: WorkflowSyncStatus,
    error?: string,
  ) => void;
  setVapiWorkflowId: (
    id: string,
    vapiWorkflowId: string,
    lastSyncedAt: string,
  ) => void;
};

type SyncResponse = {
  ok?: boolean;
  vapiWorkflowId?: string;
  lastSyncedAt?: string;
  recreated?: boolean;
  error?: string;
  code?: string;
  detail?: CompileError[] | unknown;
};

async function postVapiSync(
  record: Workflow,
  vapiPayload: VapiWorkflowPayload,
): Promise<{ data: SyncResponse; okHttp: boolean }> {
  if (hasBackendApi()) {
    const data = await apiFetch<SyncResponse>(
      `/api/v1/workflows/${record.id}/sync-vapi/`,
      {
        method: "POST",
        json: {
          vapi_payload: vapiPayload,
          vapi_workflow_id: record.vapiWorkflowId ?? null,
        },
      },
    );
    return { data, okHttp: true };
  }

  const res = await fetch(`/api/workflows/${record.id}/sync-vapi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...record, vapiPayload }),
  });
  const data = (await res.json().catch(() => ({}))) as SyncResponse;
  return { data, okHttp: res.ok };
}

function applySyncSuccess(
  record: Workflow,
  data: SyncResponse,
  mutators: WorkflowSyncMutators,
): string | undefined {
  const { setSyncStatus, setVapiWorkflowId } = mutators;
  const vid =
    data.vapiWorkflowId ?? (data as { vapi?: { id?: string } }).vapi?.id;
  const now = new Date().toISOString();
  if (vid) {
    setVapiWorkflowId(record.id, vid, now);
  } else {
    setSyncStatus(record.id, "synced");
  }
  return vid;
}

export async function syncWorkflowWithVapiPayload(
  record: Workflow,
  vapiPayload: VapiWorkflowPayload,
  mutators: WorkflowSyncMutators,
  options: { silent?: boolean } = {},
): Promise<{ ok: boolean; vapiWorkflowId?: string }> {
  const { setSyncStatus } = mutators;
  setSyncStatus(record.id, "syncing");
  const toastId = options.silent
    ? undefined
    : toast.loading(`Publishing "${record.name}"...`);

  try {
    const { data, okHttp } = await postVapiSync(record, vapiPayload);

    if (!okHttp || data.error) {
      const message = vapiErrorMessage(data, 502);
      setSyncStatus(record.id, "error", message);
      if (toastId) toast.error(message, { id: toastId });
      return { ok: false };
    }

    const vid = applySyncSuccess(record, data, mutators);

    if (toastId) {
      const verb = data.recreated
        ? "Recreated"
        : record.vapiWorkflowId
          ? "Updated"
          : "Created";
      toast.success(`${verb} workflow`, { id: toastId });
    }
    return { ok: true, vapiWorkflowId: vid };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    setSyncStatus(record.id, "error", message);
    if (toastId) toast.error(`Sync failed: ${message}`, { id: toastId });
    return { ok: false };
  }
}

export async function syncWorkflow(
  record: Workflow,
  mutators: WorkflowSyncMutators,
  options: {
    silent?: boolean;
    availableVapiToolIds?: Set<string>;
  } = {},
): Promise<{ ok: boolean; vapiWorkflowId?: string }> {
  const { setSyncStatus } = mutators;
  const toastId = options.silent
    ? undefined
    : toast.loading(`Publishing "${record.name}"...`);

  try {
    const compile = compileToVapiPayload(record, {
      availableVapiToolIds: options.availableVapiToolIds ?? new Set(),
    });
    if (!compile.ok || !compile.payload) {
      const first = compile.errors[0]?.message ?? "Workflow invalid";
      setSyncStatus(record.id, "error", first);
      if (toastId) toast.error(first, { id: toastId });
      return { ok: false };
    }

    if (hasBackendApi()) {
      try {
        await apiFetch(`/api/v1/workflows/${record.id}/`, {
          method: "PATCH",
          json: {
            name: record.name,
            description: record.description ?? "",
            global_prompt: record.globalPrompt ?? "",
            graph: { nodes: record.nodes, edges: record.edges },
          },
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not save workflow";
        setSyncStatus(record.id, "error", message);
        if (toastId) toast.error(message, { id: toastId });
        return { ok: false };
      }
    }

    setSyncStatus(record.id, "syncing");
    const { data, okHttp } = await postVapiSync(record, compile.payload);

    if (!okHttp || data.error) {
      const message = vapiErrorMessage(data, 502);
      setSyncStatus(record.id, "error", message);
      if (toastId) toast.error(message, { id: toastId });
      return { ok: false };
    }

    const vid = applySyncSuccess(record, data, mutators);

    if (toastId) {
      const verb = data.recreated
        ? "Recreated"
        : record.vapiWorkflowId
          ? "Updated"
          : "Created";
      toast.success(`${verb} workflow`, { id: toastId });
    }
    return { ok: true, vapiWorkflowId: vid };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    setSyncStatus(record.id, "error", message);
    if (toastId) toast.error(`Sync failed: ${message}`, { id: toastId });
    return { ok: false };
  }
}

export async function deleteWorkflowOnVapi(
  record: Workflow,
): Promise<{ ok: boolean }> {
  try {
    if (hasBackendApi()) {
      await apiFetch(`/api/v1/workflows/${record.id}/`, { method: "DELETE" });
      return { ok: true };
    }
    if (!record.vapiWorkflowId) return { ok: true };
    const res = await fetch(`/api/workflows/${record.id}/sync-vapi`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vapiWorkflowId: record.vapiWorkflowId }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

function vapiErrorMessage(data: SyncResponse, status: number): string {
  if (data.code === "vapi_token_missing")
    return "Voice API key is not configured on the server.";
  if (data.code === "workflow_invalid") {
    const first = Array.isArray(data.detail)
      ? (data.detail[0] as CompileError | undefined)?.message
      : undefined;
    return first ?? "Workflow has validation errors.";
  }
  return data.error ?? `Workflow sync failed (HTTP ${status})`;
}
