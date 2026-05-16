"use client";

import * as React from "react";
import { startTransition } from "react";
import Vapi from "@vapi-ai/web";
import { Loader2Icon, MicIcon, SquareIcon } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import { hasBackendApi } from "@/lib/api/env";
import {
  mergeVapiClientMessage,
  newTranscriptLineId,
  type TranscriptChatLine,
} from "@/lib/vapi/merge-client-message";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Vapi's Web SDK `start(..., workflowId)` always creates a voice/WebRTC session.
 * The HTTP Chat API (`POST /chat`) is for assistants/squads — not workflow IDs.
 * See: https://docs.vapi.ai/chat/quickstart
 */

type ChatLine = TranscriptChatLine;

type WebCallState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; publicKey: string; workflowId: string }
  | { status: "error"; message: string };

/** Daily often emits this when the room closes normally — not an app bug. */
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
    /* join/destroy races — ignore */
  }
}

async function resolveWebCallForWorkflow(
  workflowRecordId: string,
): Promise<{ publicKey: string; workflowId: string } | { error: string }> {
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

export function WorkflowTestSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowName: string;
  /** Django external id (`wf_12`) — server resolves the Vapi workflow id. */
  workflowRecordId: string;
  /** Whether the workflow row has a synced Vapi id (UI hint only). */
  voiceSynced?: boolean;
}) {
  const { open, onOpenChange, workflowName, workflowRecordId, voiceSynced = false } = props;
  const vapiRef = React.useRef<Vapi | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const [lines, setLines] = React.useState<ChatLine[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [callState, setCallState] = React.useState<WebCallState>({ status: "idle" });

  /**
   * Prefetch the Vapi **public** key while the sheet is open, before the user clicks
   * "Start". That keeps `await resolvePublicKeyForWorkflow` out of the click handler's
   * critical path. Browsers tie mic / WebRTC to user activation; long async work
   * between pointer-up and `getUserMedia` (inside Vapi → Daily `join`) can cause the
   * first join to fail and the second click to succeed.
   */
  React.useEffect(() => {
    if (!open) {
      startTransition(() => setCallState({ status: "idle" }));
      return;
    }
    const wid = workflowRecordId.trim();
    if (!wid) {
      startTransition(() => setCallState({ status: "idle" }));
      return;
    }
    let cancelled = false;
    startTransition(() => setCallState({ status: "loading" }));
    void resolveWebCallForWorkflow(wid).then((res) => {
      if (cancelled) return;
      startTransition(() => {
        if ("error" in res) setCallState({ status: "error", message: res.error });
        else
          setCallState({
            status: "ready",
            publicKey: res.publicKey,
            workflowId: res.workflowId,
          });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [open, workflowRecordId, voiceSynced]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        const client = vapiRef.current;
        vapiRef.current = null;
        void safeStopVapi(client);
      }
      queueMicrotask(() => {
        setStatus(null);
        setLines([]);
        setActive(false);
        setBusy(false);
      });
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const appendLine = React.useCallback((role: ChatLine["role"], text: string) => {
    const t = text.trim();
    if (!t) return;
    setLines((prev) => [
      ...prev,
      { id: newTranscriptLineId(), role, text: t },
    ]);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, open]);

  /** Tab close / navigation: do not rely on React unmount (avoids dev double-invoke races). */
  React.useEffect(() => {
    const onPageHide = () => {
      const client = vapiRef.current;
      vapiRef.current = null;
      void safeStopVapi(client);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  const stop = React.useCallback(async () => {
    const client = vapiRef.current;
    vapiRef.current = null;
    await safeStopVapi(client);
    setActive(false);
    setBusy(false);
    setStatus("Session ended");
  }, []);

  const start = React.useCallback(async () => {
    if (!workflowRecordId.trim()) {
      setStatus("Save this workflow on the server before testing.");
      return;
    }
    if (callState.status !== "ready") {
      if (callState.status === "loading") {
        setStatus("Still preparing — wait a moment, then try again.");
      } else if (callState.status === "error") {
        setStatus(callState.message);
      } else {
        setStatus("Save and sync this workflow to Vapi first.");
      }
      return;
    }
    const { publicKey, workflowId: vapiWid } = callState;

    setBusy(true);
    setStatus(null);
    setLines([]);

    const previous = vapiRef.current;
    if (previous) {
      vapiRef.current = null;
      await safeStopVapi(previous);
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setActive(true);
      setStatus(
        "Call connected — speak to test. Captions below show speech when Vapi sends transcript events.",
      );
      appendLine("system", "Voice session started.");
    });
    vapi.on("call-end", () => {
      setActive(false);
      appendLine("system", "Call ended.");
      setStatus("Disconnected");
    });
    vapi.on("error", (e: unknown) => {
      if (isBenignDailyTeardown(e)) return;
      const msg =
        e && typeof e === "object" && "error" in e
          ? String((e as { error?: unknown }).error)
          : String(e);
      setStatus(`Error: ${msg}`);
      setBusy(false);
    });
    vapi.on("message", (msg: unknown) => {
      setLines((prev) => mergeVapiClientMessage(prev, msg));
    });

    try {
      await vapi.start(undefined, undefined, undefined, vapiWid);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to start call");
      vapiRef.current = null;
    } finally {
      setBusy(false);
    }
  }, [appendLine, callState, workflowRecordId]);

  const canStart =
    Boolean(workflowRecordId.trim()) &&
    callState.status === "ready" &&
    !busy &&
    !active;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Test workflow (browser call)</SheetTitle>
          <SheetDescription>
            {workflowName}
            {!voiceSynced ? (
              <span className="text-destructive mt-1 block text-xs">
                Sync to Vapi before testing.
              </span>
            ) : (
              <span className="text-muted-foreground mt-1 block text-xs">
                Voice runs through your workspace workflow — no manual Vapi id.
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
          <div className="border-border/60 bg-muted/20 text-muted-foreground rounded-lg border p-3 text-xs leading-relaxed">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <MicIcon className="size-4 shrink-0" />
              Voice only for workflows
            </p>
            <p className="mt-2">
              Vapi&apos;s{" "}
              <a
                className="text-primary underline-offset-2 hover:underline"
                href="https://docs.vapi.ai/chat/quickstart"
                target="_blank"
                rel="noreferrer"
              >
                Chat API
              </a>{" "}
              uses an <strong>assistant</strong> id, not a workflow id. The Web SDK always starts a
              browser voice session for workflows (same as the Vapi dashboard &quot;Call&quot;
              button). A separate &quot;text chat&quot; mode is not available for workflow ids.
            </p>
          </div>

          {callState.status === "loading" && open ? (
            <p className="text-muted-foreground text-xs">
              Preparing Vapi browser key so the first call can grab the microphone reliably…
            </p>
          ) : null}

          {callState.status === "error" && open ? (
            <p className="text-destructive text-xs leading-relaxed">{callState.message}</p>
          ) : null}

          {status ? (
            <p className="text-muted-foreground text-xs leading-relaxed">{status}</p>
          ) : null}

          <div
            ref={scrollRef}
            className="border-border/60 bg-muted/20 h-[min(42vh,320px)] overflow-y-auto rounded-lg border"
          >
            <div className="space-y-2 p-3">
              {lines.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Session notes and live captions appear here during the call.
                </p>
              ) : (
                lines.map((ln) => (
                  <div
                    key={ln.id}
                    className={
                      ln.role === "system"
                        ? "text-muted-foreground px-1 text-[11px]"
                        : "text-foreground rounded-md bg-background/40 px-2 py-1.5 font-mono text-[11px] leading-snug"
                    }
                  >
                    {ln.text}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            {!active ? (
              <Button
                type="button"
                disabled={!canStart}
                onClick={() => void start()}
                className="gap-2"
              >
                {busy || callState.status === "loading" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                <MicIcon className="size-4" />
                Start browser call
              </Button>
            ) : (
              <Button type="button" variant="destructive" onClick={() => void stop()} className="gap-2">
                <SquareIcon className="size-4" />
                End call
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
