"use client";

import * as React from "react";
import { startTransition } from "react";
import Vapi from "@vapi-ai/web";
import { Loader2Icon, MicIcon, SquareIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  mergeVapiClientMessage,
  newTranscriptLineId,
  type TranscriptChatLine,
} from "@/lib/vapi/merge-client-message";
import { parseWorkflowRuntimeMessage } from "@/lib/vapi/parse-workflow-runtime";
import {
  isBenignDailyTeardown,
  resolveWebCallForWorkflow,
  safeStopVapi,
  workflowTestStartOverrides,
} from "@/lib/vapi/workflow-web-call";

type ChatLine = TranscriptChatLine;

type WebCallState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; publicKey: string; workflowId: string }
  | { status: "error"; message: string };

export function WorkflowTestPanel({
  workflowName,
  workflowRecordId,
  voiceSynced = false,
  onClose,
  onCallStart,
  onCallEnd,
  onActiveNodeChange,
}: {
  workflowName: string;
  workflowRecordId: string;
  voiceSynced?: boolean;
  onClose: () => void;
  onCallStart?: () => void;
  onCallEnd?: () => void;
  onActiveNodeChange?: (nodeId: string | null) => void;
}) {
  const vapiRef = React.useRef<Vapi | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const [lines, setLines] = React.useState<ChatLine[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [callState, setCallState] = React.useState<WebCallState>({ status: "idle" });

  React.useEffect(() => {
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
  }, [workflowRecordId, voiceSynced]);

  const appendLine = React.useCallback((role: ChatLine["role"], text: string) => {
    const t = text.trim();
    if (!t) return;
    setLines((prev) => [
      ...prev,
      { id: newTranscriptLineId(), role, text: t },
    ]);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  React.useEffect(() => {
    const onPageHide = () => {
      const client = vapiRef.current;
      vapiRef.current = null;
      void safeStopVapi(client);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  React.useEffect(() => {
    return () => {
      const client = vapiRef.current;
      vapiRef.current = null;
      void safeStopVapi(client);
    };
  }, []);

  const stop = React.useCallback(async () => {
    const client = vapiRef.current;
    vapiRef.current = null;
    await safeStopVapi(client);
    setActive(false);
    setBusy(false);
    setStatus("Session ended");
    onActiveNodeChange?.(null);
    onCallEnd?.();
  }, [onActiveNodeChange, onCallEnd]);

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
        setStatus("Save and publish this workflow first.");
      }
      return;
    }
    const { publicKey, workflowId: vapiWid } = callState;

    setBusy(true);
    setStatus(null);
    setLines([]);
    onActiveNodeChange?.(null);

    const previous = vapiRef.current;
    if (previous) {
      vapiRef.current = null;
      await safeStopVapi(previous);
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setActive(true);
      onCallStart?.();
      setStatus(
        "Call connected — the canvas highlights the active node as the workflow runs.",
      );
      appendLine("system", "Voice session started.");
    });
    vapi.on("call-end", () => {
      setActive(false);
      appendLine("system", "Call ended.");
      setStatus("Disconnected");
      onActiveNodeChange?.(null);
      onCallEnd?.();
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
      const runtime = parseWorkflowRuntimeMessage(msg);
      if (runtime) {
        onActiveNodeChange?.(runtime.activeNodeId);
      }
      setLines((prev) => mergeVapiClientMessage(prev, msg));
    });

    try {
      await vapi.start(
        undefined,
        workflowTestStartOverrides() as unknown as Parameters<Vapi["start"]>[1],
        undefined,
        vapiWid,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to start call");
      vapiRef.current = null;
      onCallEnd?.();
    } finally {
      setBusy(false);
    }
  }, [
    appendLine,
    callState,
    onActiveNodeChange,
    onCallEnd,
    onCallStart,
    workflowRecordId,
  ]);

  const handleClose = React.useCallback(() => {
    void stop();
    onClose();
  }, [onClose, stop]);

  const canStart =
    Boolean(workflowRecordId.trim()) &&
    callState.status === "ready" &&
    !busy &&
    !active;

  return (
    <aside className="border-border/60 bg-card/40 flex h-full w-[min(100%,380px)] min-w-[320px] shrink-0 flex-col border-l">
      <div className="border-border/60 flex items-start justify-between gap-2 border-b px-3 py-3">
        <div className="min-w-0 grid gap-0.5">
          <h2 className="text-sm font-semibold">Test call</h2>
          <p className="text-muted-foreground truncate text-xs">{workflowName}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={handleClose}
          aria-label="Close test panel"
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        {!voiceSynced ? (
          <p className="text-destructive text-xs leading-relaxed">
            Save and publish this workflow before testing.
          </p>
        ) : null}

        {callState.status === "loading" ? (
          <p className="text-muted-foreground text-xs">
            Preparing voice session…
          </p>
        ) : null}

        {callState.status === "error" ? (
          <p className="text-destructive text-xs leading-relaxed">
            {callState.message}
          </p>
        ) : null}

        {status ? (
          <p className="text-muted-foreground text-xs leading-relaxed">{status}</p>
        ) : null}

        <div
          ref={scrollRef}
          className="border-border/60 bg-muted/20 min-h-0 flex-1 overflow-y-auto rounded-lg border"
        >
          <div className="space-y-2 p-3">
            {lines.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                Live transcript appears here. The canvas follows the active workflow
                node.
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

        <div className="flex flex-col gap-2">
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
            <Button
              type="button"
              variant="destructive"
              onClick={() => void stop()}
              className="gap-2"
            >
              <SquareIcon className="size-4" />
              End call
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
