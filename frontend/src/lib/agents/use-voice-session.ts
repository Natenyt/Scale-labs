"use client";

import * as React from "react";
import Vapi from "@vapi-ai/web";

import { apiFetch } from "@/lib/api/client";
import { hasBackendApi } from "@/lib/api/env";

export type VoiceSessionStatus = "idle" | "loading" | "ready" | "error";

export type VoiceSessionState = {
  status: VoiceSessionStatus;
  errorMessage: string | null;
  publicKey: string | null;
  assistantId: string | null;
  active: boolean;
  busy: boolean;
};

function isServerAgentId(id: string | undefined): boolean {
  return typeof id === "string" && /^ag_\d+$/.test(id);
}

function isBenignDailyTeardown(e: unknown): boolean {
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

async function safeStopVapi(client: Vapi | null): Promise<void> {
  if (!client) return;
  try {
    await client.stop();
  } catch {
    /* join/destroy races */
  }
}

async function fetchWebCallConfig(
  agentRecordId: string,
): Promise<{ publicKey: string; assistantId: string } | { error: string }> {
  const fromEnv = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() ?? "";
  if (!hasBackendApi()) {
    return {
      error:
        "Set NEXT_PUBLIC_API_BASE_URL and sign in to use voice from this workspace.",
    };
  }
  try {
    const cfg = await apiFetch<{
      publicKey: string;
      assistantId: string | null;
      workflowId: string | null;
    }>("/api/v1/calls/web-config/", {
      method: "POST",
      json: { agent_id: agentRecordId },
    });
    const pk = (cfg.publicKey || fromEnv).trim();
    if (!pk) {
      return {
        error:
          "Voice is not configured on the server. Set VAPI_PUBLIC_KEY in backend/.env.",
      };
    }
    const aid = (cfg.assistantId ?? "").trim();
    if (!aid) {
      return {
        error:
          "This agent is not linked to voice yet. Save the agent or use Re-sync voice settings.",
      };
    }
    return { publicKey: pk, assistantId: aid };
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Could not prepare voice. Sign in and confirm your organization is selected.",
    };
  }
}

type Options = {
  /** When false, skips prefetch (e.g. sheet closed). Default true when id is valid. */
  enabled?: boolean;
};

type ConfigCache = {
  requestKey: string;
  status: "ready" | "error";
  errorMessage: string | null;
  publicKey: string | null;
  assistantId: string | null;
};

/**
 * Prefetch web-config for an org agent (`ag_*`) and start/stop Vapi Web SDK calls.
 */
export function useVoiceSession(
  agentRecordId: string | undefined,
  options: Options = {},
): VoiceSessionState & {
  refresh: () => void;
  startCall: () => Promise<string | null>;
  stopCall: () => Promise<void>;
  sendVoiceMessage: (text: string) => void;
  onVapiMessage: (handler: (msg: unknown) => void) => void;
} {
  const enabled = options.enabled ?? true;
  const id = (agentRecordId ?? "").trim();
  const canLoad = enabled && isServerAgentId(id);

  const [configCache, setConfigCache] = React.useState<ConfigCache | null>(null);
  const [active, setActive] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const vapiRef = React.useRef<Vapi | null>(null);
  const messageHandlerRef = React.useRef<((msg: unknown) => void) | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const requestKey = canLoad ? `${id}:${refreshNonce}` : "";

  const refresh = React.useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  React.useEffect(() => {
    if (!canLoad) return;

    const key = requestKey;
    let cancelled = false;

    void fetchWebCallConfig(id).then((res) => {
      if (cancelled) return;
      if ("error" in res) {
        setConfigCache({
          requestKey: key,
          status: "error",
          errorMessage: res.error,
          publicKey: null,
          assistantId: null,
        });
      } else {
        setConfigCache({
          requestKey: key,
          status: "ready",
          errorMessage: null,
          publicKey: res.publicKey,
          assistantId: res.assistantId,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [canLoad, id, requestKey]);

  const cacheMatches = configCache?.requestKey === requestKey;

  const resolvedStatus: VoiceSessionStatus = !canLoad
    ? "idle"
    : !cacheMatches
      ? "loading"
      : configCache.status === "ready"
        ? "ready"
        : "error";
  const resolvedError = cacheMatches ? configCache.errorMessage : null;
  const resolvedPublicKey = cacheMatches ? configCache.publicKey : null;
  const resolvedAssistantId = cacheMatches ? configCache.assistantId : null;

  React.useEffect(() => {
    return () => {
      const client = vapiRef.current;
      vapiRef.current = null;
      void safeStopVapi(client);
    };
  }, []);

  React.useEffect(() => {
    const onPageHide = () => {
      const client = vapiRef.current;
      vapiRef.current = null;
      void safeStopVapi(client);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  const onVapiMessage = React.useCallback((handler: (msg: unknown) => void) => {
    messageHandlerRef.current = handler;
  }, []);

  const startCall = React.useCallback(async (): Promise<string | null> => {
    if (!isServerAgentId(id)) {
      return "This agent must be saved on the server before starting a call.";
    }
    if (
      resolvedStatus !== "ready" ||
      !resolvedPublicKey ||
      !resolvedAssistantId
    ) {
      if (resolvedStatus === "loading") {
        return "Still preparing voice — wait a moment, then try again.";
      }
      return resolvedError ?? "Voice is not ready for this agent.";
    }

    setBusy(true);
    const previous = vapiRef.current;
    if (previous) {
      vapiRef.current = null;
      await safeStopVapi(previous);
    }

    const vapi = new Vapi(resolvedPublicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setActive(true);
      setBusy(false);
    });
    vapi.on("call-end", () => {
      setActive(false);
    });
    vapi.on("error", (e: unknown) => {
      if (isBenignDailyTeardown(e)) return;
      setBusy(false);
    });
    vapi.on("message", (msg: unknown) => {
      messageHandlerRef.current?.(msg);
    });

    try {
      await vapi.start(resolvedAssistantId);
      return null;
    } catch (e) {
      vapiRef.current = null;
      setBusy(false);
      return e instanceof Error ? e.message : "Failed to start call";
    }
  }, [
    id,
    resolvedAssistantId,
    resolvedError,
    resolvedPublicKey,
    resolvedStatus,
  ]);

  const stopCall = React.useCallback(async () => {
    const client = vapiRef.current;
    vapiRef.current = null;
    await safeStopVapi(client);
    setActive(false);
    setBusy(false);
  }, []);

  const sendVoiceMessage = React.useCallback((text: string) => {
    const vapi = vapiRef.current;
    const t = text.trim();
    if (!vapi || !active || !t) return;
    vapi.send({
      type: "add-message",
      message: { role: "user", content: t },
      triggerResponseEnabled: true,
    });
  }, [active]);

  return {
    status: resolvedStatus,
    errorMessage: resolvedError,
    publicKey: resolvedPublicKey,
    assistantId: resolvedAssistantId,
    active,
    busy,
    refresh,
    startCall,
    stopCall,
    sendVoiceMessage,
    onVapiMessage,
  };
}
