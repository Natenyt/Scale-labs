/**
 * Client-side helper for Notion → Vapi tool sync.
 * Uses Django when `NEXT_PUBLIC_API_BASE_URL` is set, otherwise the Next.js route.
 */

import { toast } from "sonner";

import { apiFetch } from "@/lib/api/client";
import { hasBackendApi } from "@/lib/api/env";

import type {
  IntegrationSyncStatus,
  NotionIntegration,
  VapiToolRef,
} from "@/lib/integrations/types";

type Mutators = {
  setSyncStatus: (
    id: string,
    status: IntegrationSyncStatus,
    error?: string,
  ) => void;
  setVapiTools: (id: string, refs: VapiToolRef[]) => void;
};

type SyncResponse = {
  ok?: boolean;
  vapiTools?: VapiToolRef[];
  errors?: { kind: string; error: string }[];
  error?: string;
  code?: string;
};

export async function resyncNotionTools(
  record: NotionIntegration,
  mutators: Mutators,
  options: { silent?: boolean } = {},
): Promise<{ ok: boolean; tools: VapiToolRef[] }> {
  const { setSyncStatus, setVapiTools } = mutators;
  setSyncStatus(record.id, "syncing");
  const toastId = options.silent
    ? undefined
    : toast.loading(`Syncing tools for "${record.label}"...`);
  try {
    let data: SyncResponse;
    let resOk: boolean;

    if (hasBackendApi()) {
      data = await apiFetch<SyncResponse>(
        `/api/v1/integrations/notion/${record.id}/sync-tools/`,
        {
          method: "POST",
          json: {
            label: record.label,
            databaseId: record.databaseId,
            dataSourceId: record.dataSourceId,
            fieldMap: record.fieldMap,
            ...(record.token?.trim() ? { token: record.token.trim() } : {}),
          },
        },
      );
      resOk = true;
    } else {
      const res = await fetch(
        `/api/integrations/notion/${record.id}/sync-tools`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        },
      );
      data = (await res.json().catch(() => ({}))) as SyncResponse;
      resOk = res.ok;
    }

    if (!resOk) {
      const message = vapiErrorMessage(data, 502);
      setSyncStatus(record.id, "error", message);
      if (toastId) toast.error(message, { id: toastId });
      return { ok: false, tools: [] };
    }

    const tools = data.vapiTools ?? [];
    if (tools.length > 0) setVapiTools(record.id, tools);

    if (!data.ok) {
      const firstErr = data.errors?.[0]?.error ?? "Some tools failed";
      setSyncStatus(record.id, "error", firstErr);
      if (toastId) toast.error(`Sync partial: ${firstErr}`, { id: toastId });
      return { ok: false, tools };
    }

    setSyncStatus(record.id, "synced");
    if (toastId)
      toast.success(`Synced ${tools.length} Vapi tools`, { id: toastId });
    return { ok: true, tools };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    setSyncStatus(record.id, "error", message);
    if (toastId) toast.error(`Sync failed: ${message}`, { id: toastId });
    return { ok: false, tools: [] };
  }
}

export async function deleteNotionToolsOnVapi(
  record: NotionIntegration,
): Promise<{ ok: boolean }> {
  const refs = record.vapiTools ?? [];
  if (refs.length === 0) return { ok: true };
  try {
    if (hasBackendApi()) {
      const data = await apiFetch<{ ok?: boolean }>(
        `/api/v1/integrations/notion/${record.id}/sync-tools/`,
        {
          method: "DELETE",
          json: { vapiTools: refs },
        },
      );
      return { ok: data.ok !== false };
    }
    const res = await fetch(
      `/api/integrations/notion/${record.id}/sync-tools`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vapiTools: refs }),
      },
    );
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

function vapiErrorMessage(data: SyncResponse, status: number): string {
  if (data.code === "vapi_token_missing")
    return "VAPI_API_KEY is not configured on the server.";
  if (data.code === "vapi_webhook_base_missing")
    return "VAPI_WEBHOOK_BASE is not configured. Set a public https URL, or DEV_PUBLIC_ORIGIN (ngrok on port 3000) in backend/.env.";
  if (data.code === "vapi_webhook_base_not_public")
    return (
      data.error ??
      "Webhook URL is localhost — Vapi cannot reach it. Set DEV_PUBLIC_ORIGIN to your ngrok URL and re-sync tools."
    );
  if (data.code === "vapi_shared_secret_missing")
    return "VAPI_SHARED_SECRET is not configured on the server.";
  return data.error ?? `Vapi sync failed (HTTP ${status})`;
}
