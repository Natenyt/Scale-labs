"use client";

import * as React from "react";
import { startTransition } from "react";
import {
  Loader2Icon,
  MessageSquareIcon,
  MicIcon,
  SendIcon,
  SquareIcon,
} from "lucide-react";

import { useAgentVoiceSession } from "@/components/agents/detail/voice-session-context";
import { apiFetch } from "@/lib/api/client";
import { hasBackendApi } from "@/lib/api/env";
import {
  mergeVapiClientMessage,
  newTranscriptLineId,
  type TranscriptChatLine,
} from "@/lib/vapi/merge-client-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatLine = TranscriptChatLine;
type TextTurn = { id: string; role: "user" | "assistant"; text: string };

function extractChatId(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const id = (data as Record<string, unknown>).id;
  return typeof id === "string" ? id : "";
}

function extractAssistantReply(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const out = (data as Record<string, unknown>).output;
  if (!Array.isArray(out) || out.length === 0) return "";
  const last = out[out.length - 1] as Record<string, unknown>;
  const c = last.content;
  return typeof c === "string" ? c.trim() : "";
}

export type AgentTestSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  agentRecordId: string;
  initialMode?: "voice" | "text";
};

export function AgentTestSheet({
  open,
  onOpenChange,
  agentName,
  agentRecordId,
  initialMode = "voice",
}: AgentTestSheetProps) {
  const {
    status: voiceStatus,
    errorMessage: voiceError,
    active: voiceActive,
    busy: voiceBusy,
    startCall,
    stopCall,
    sendVoiceMessage,
    onVapiMessage,
  } = useAgentVoiceSession();

  const [sheetMode, setSheetMode] = React.useState<"voice" | "text">(initialMode);
  React.useEffect(() => {
    if (open) startTransition(() => setSheetMode(initialMode));
  }, [open, initialMode]);

  const [status, setStatus] = React.useState<string | null>(null);
  const [lines, setLines] = React.useState<ChatLine[]>([]);
  const [voiceDraft, setVoiceDraft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const [textTurns, setTextTurns] = React.useState<TextTurn[]>([]);
  const [textDraft, setTextDraft] = React.useState("");
  const [textBusy, setTextBusy] = React.useState(false);
  const [textError, setTextError] = React.useState<string | null>(null);
  const [previousChatId, setPreviousChatId] = React.useState<string | null>(null);
  const textScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    onVapiMessage((msg) => {
      setLines((prev) => mergeVapiClientMessage(prev, msg));
    });
  }, [onVapiMessage]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        void stopCall();
      }
      queueMicrotask(() => {
        setStatus(null);
        setLines([]);
        setVoiceDraft("");
        setTextTurns([]);
        setTextDraft("");
        setTextError(null);
        setPreviousChatId(null);
      });
      onOpenChange(next);
    },
    [onOpenChange, stopCall],
  );

  React.useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, open]);

  React.useEffect(() => {
    if (!open) return;
    const el = textScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [textTurns, open]);

  const startVoice = React.useCallback(async () => {
    setStatus(null);
    setLines([]);
    const err = await startCall();
    if (err) {
      setStatus(err);
      return;
    }
    setStatus("Connected — speak or type below.");
    setLines((prev) => [
      ...prev,
      { id: newTranscriptLineId(), role: "system", text: "Voice session started." },
    ]);
  }, [startCall]);

  const sendVoiceText = React.useCallback(() => {
    const t = voiceDraft.trim();
    if (!t || !voiceActive) return;
    sendVoiceMessage(t);
    setLines((prev) => [
      ...prev,
      {
        id: newTranscriptLineId(),
        role: "transcript",
        text: `[user] ${t}`,
        streamRole: "user",
        isStreaming: false,
      },
    ]);
    setVoiceDraft("");
  }, [sendVoiceMessage, voiceActive, voiceDraft]);

  const sendTextChat = React.useCallback(async () => {
    const input = textDraft.trim();
    if (!input || !agentRecordId.trim()) return;
    if (!hasBackendApi()) {
      setTextError("Sign in with the API configured to use text chat.");
      return;
    }
    setTextBusy(true);
    setTextError(null);
    setTextDraft("");
    setTextTurns((prev) => [
      ...prev,
      { id: newTranscriptLineId(), role: "user", text: input },
    ]);
    try {
      const data = await apiFetch<unknown>("/api/v1/calls/chat/", {
        method: "POST",
        json: {
          agent_id: agentRecordId,
          input,
          ...(previousChatId ? { previous_chat_id: previousChatId } : {}),
        },
      });
      const cid = extractChatId(data);
      if (cid) setPreviousChatId(cid);
      setTextTurns((prev) => [
        ...prev,
        {
          id: newTranscriptLineId(),
          role: "assistant",
          text: extractAssistantReply(data) || "(empty reply)",
        },
      ]);
    } catch (e) {
      setTextError(e instanceof Error ? e.message : "Chat request failed");
    } finally {
      setTextBusy(false);
    }
  }, [agentRecordId, previousChatId, textDraft]);

  const canStartVoice =
    voiceStatus === "ready" && !voiceBusy && !voiceActive;

  const voiceStatusLabel =
    voiceStatus === "ready"
      ? "Voice ready"
      : voiceStatus === "loading"
        ? "Preparing voice…"
        : voiceStatus === "error"
          ? "Voice unavailable"
          : "Voice idle";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Test {agentName}</SheetTitle>
          <SheetDescription>
            Browser voice and text chat use your workspace agent — no API keys or assistant
            IDs to paste.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
          <p
            className={cn(
              "rounded-md border px-3 py-2 text-xs",
              voiceStatus === "ready"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : voiceStatus === "error"
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-border/60 bg-muted/20 text-muted-foreground",
            )}
          >
            {voiceStatusLabel}
            {voiceError ? (
              <span className="mt-1 block leading-relaxed">{voiceError}</span>
            ) : null}
          </p>

          <div className="bg-muted/40 flex rounded-lg border p-0.5">
            <button
              type="button"
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors",
                sheetMode === "voice"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setSheetMode("voice")}
            >
              <MicIcon className="size-3.5" />
              Voice
            </button>
            <button
              type="button"
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors",
                sheetMode === "text"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setSheetMode("text")}
            >
              <MessageSquareIcon className="size-3.5" />
              Text chat
            </button>
          </div>

          {sheetMode === "voice" ? (
            <>
              {status ? (
                <p className="text-muted-foreground text-xs leading-relaxed">{status}</p>
              ) : null}
              <div
                ref={scrollRef}
                className="border-border/60 bg-muted/20 h-[min(32vh,240px)] overflow-y-auto rounded-lg border"
              >
                <div className="space-y-2 p-3">
                  {lines.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      Start a call to see live captions here.
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
              {voiceActive ? (
                <div className="grid gap-2">
                  <Label className="text-xs">Message assistant (text)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={voiceDraft}
                      onChange={(e) => setVoiceDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendVoiceText();
                        }
                      }}
                      placeholder="Type a message…"
                      className="h-9 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 gap-1"
                      onClick={sendVoiceText}
                      disabled={!voiceDraft.trim()}
                    >
                      <SendIcon className="size-3.5" />
                      Send
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="mt-auto flex flex-col gap-2">
                {!voiceActive ? (
                  <Button
                    type="button"
                    disabled={!canStartVoice}
                    onClick={() => void startVoice()}
                    className="gap-2"
                  >
                    {voiceBusy || voiceStatus === "loading" ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : null}
                    <MicIcon className="size-4" />
                    Start voice call
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void stopCall()}
                    className="gap-2"
                  >
                    <SquareIcon className="size-4" />
                    End call
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              {textError ? (
                <p className="text-destructive text-xs leading-relaxed">{textError}</p>
              ) : null}
              <div
                ref={textScrollRef}
                className="border-border/60 bg-muted/20 flex h-[min(38vh,280px)] flex-col overflow-y-auto rounded-lg border"
              >
                <div className="mt-auto space-y-2 p-3">
                  {textTurns.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      Send a message to chat (no microphone).
                    </p>
                  ) : (
                    textTurns.map((t) => (
                      <div
                        key={t.id}
                        className={cn(
                          "max-w-[95%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                          t.role === "user"
                            ? "bg-primary/15 ml-auto"
                            : "bg-background/80 mr-auto border",
                        )}
                      >
                        {t.text}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Textarea
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  placeholder="Write to the assistant…"
                  rows={3}
                  className="min-h-[72px] resize-none text-sm"
                  disabled={textBusy}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="gap-2"
                    disabled={textBusy || !textDraft.trim()}
                    onClick={() => void sendTextChat()}
                  >
                    {textBusy ? <Loader2Icon className="size-4 animate-spin" /> : null}
                    <SendIcon className="size-4" />
                    Send
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={textBusy || textTurns.length === 0}
                    onClick={() => {
                      setTextTurns([]);
                      setPreviousChatId(null);
                      setTextError(null);
                    }}
                  >
                    New thread
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
