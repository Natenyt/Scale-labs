"use client";

import * as React from "react";
import Link from "next/link";
import {
  CloudUploadIcon,
  Loader2Icon,
  MessageSquareIcon,
  MicIcon,
  PhoneIcon,
  RocketIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAgents } from "@/components/agents/agents-store";
import { AgentTestSheet } from "@/components/agents/agent-test-sheet";
import { useAgentVoiceSession } from "@/components/agents/detail/voice-session-context";
import { syncAgentToVapi } from "@/lib/agents/sync-vapi";
import type { Agent } from "@/lib/agents/types";

type Props = {
  agent: Agent;
  onChange: (patch: Partial<Agent>) => void;
};

function formatRelative(iso: string | null) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function RightRail({ agent, onChange }: Props) {
  const { remote, setAgentVapiAssistantId } = useAgents();
  const voice = useAgentVoiceSession();
  const [testOpen, setTestOpen] = React.useState(false);
  const [testInitialMode, setTestInitialMode] = React.useState<"voice" | "text">("voice");
  const [syncBusy, setSyncBusy] = React.useState(false);

  const isLive = agent.status === "live";
  const max = Math.max(...agent.last7Days, 1);

  const voiceLabel =
    voice.status === "ready"
      ? "Voice ready"
      : voice.status === "loading"
        ? "Preparing voice…"
        : voice.status === "error"
          ? "Voice unavailable"
          : "Voice";

  const handleDeploy = () => {
    if (isLive) {
      onChange({ status: "draft" });
      toast.success(`Pulled "${agent.name}" back to draft`);
    } else {
      onChange({ status: "live" });
      toast.success(`Deployed "${agent.name}"`, {
        description: agent.phoneNumber
          ? `Now answering ${agent.phoneNumber}`
          : "Assign a phone number to start receiving calls.",
      });
    }
  };

  return (
    <aside className="lg:sticky lg:top-16 lg:self-start">
      <div className="grid gap-4">
        <Card>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Status
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "h-5 gap-1 px-1.5 text-[10px] font-medium uppercase tracking-wider",
                  isLive
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-muted-foreground/30 text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isLive ? "bg-emerald-400" : "bg-muted-foreground/60",
                  )}
                />
                {agent.status}
              </Badge>
            </div>

            <div className="grid gap-1.5">
              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Phone number
              </div>
              {agent.phoneNumber ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium tabular-nums">
                    <PhoneIcon className="text-muted-foreground size-3.5" />
                    {agent.phoneNumber}
                  </div>
                  <Link
                    href={`/phone-numbers?agent=${encodeURIComponent(agent.id)}`}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    Change
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Not assigned
                  </span>
                  <Link
                    href={`/phone-numbers?agent=${encodeURIComponent(agent.id)}`}
                    className="text-foreground hover:underline text-xs font-medium"
                  >
                    Assign
                  </Link>
                </div>
              )}
            </div>

            <div className="grid gap-1.5">
              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Browser voice
              </div>
              <p
                className={cn(
                  "text-sm font-medium",
                  voice.status === "ready"
                    ? "text-emerald-400"
                    : voice.status === "error"
                      ? "text-destructive"
                      : "text-muted-foreground",
                )}
              >
                {voiceLabel}
              </p>
              {voice.errorMessage ? (
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {voice.errorMessage}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setTestInitialMode("voice");
                  setTestOpen(true);
                }}
                className="w-full justify-center gap-2"
                disabled={voice.status === "loading"}
              >
                <MicIcon className="size-4" />
                Talk to agent
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTestInitialMode("text");
                  setTestOpen(true);
                }}
                className="w-full justify-center gap-2"
              >
                <MessageSquareIcon className="size-4" />
                Text the agent
              </Button>
              {remote ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground w-full justify-center gap-2 text-xs"
                  disabled={syncBusy}
                  onClick={() => {
                    setSyncBusy(true);
                    void (async () => {
                      try {
                        const res = await syncAgentToVapi(agent.id);
                        if (res.ok && res.vapiAssistantId) {
                          setAgentVapiAssistantId(agent.id, res.vapiAssistantId);
                          voice.refresh();
                          toast.success("Voice settings re-synced");
                        }
                      } catch (e) {
                        const body =
                          e instanceof Error && "body" in e
                            ? (e as Error & { body?: unknown }).body
                            : null;
                        const msg =
                          body &&
                          typeof body === "object" &&
                          body &&
                          "error" in body
                            ? String((body as Record<string, unknown>).error)
                            : e instanceof Error
                              ? e.message
                              : "Sync failed";
                        toast.error(msg);
                      } finally {
                        setSyncBusy(false);
                      }
                    })();
                  }}
                >
                  {syncBusy ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <CloudUploadIcon className="size-3.5" />
                  )}
                  Re-sync voice settings
                </Button>
              ) : null}
              <Button onClick={handleDeploy} className="w-full justify-center gap-2">
                <RocketIcon className="size-4" />
                {isLive ? "Pull from production" : "Deploy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Last 7 days
              </span>
              <Badge variant="secondary" className="font-normal tabular-nums">
                {agent.last7Days.reduce((a, b) => a + b, 0)} min
              </Badge>
            </div>
            <div className="flex h-16 items-end gap-1.5">
              {agent.last7Days.map((value, idx) => (
                <div
                  key={idx}
                  className="bg-foreground/15 relative flex-1 rounded-sm"
                  style={{
                    height: `${Math.max(8, (value / max) * 100)}%`,
                  }}
                >
                  {value > 0 && (
                    <div
                      className="bg-foreground/70 absolute inset-x-0 bottom-0 rounded-sm"
                      style={{
                        height: `${(value / max) * 100}%`,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-muted-foreground flex justify-between text-[10px]">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="flex-1 text-center">
                  {d}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-3 text-xs">
            <Stat label="Last call" value={formatRelative(agent.lastCallAt)} />
            <Stat
              label="This month"
              value={`${agent.minutesThisMonth} min`}
            />
            <Stat label="Avg cost / call" value="—" />
          </CardContent>
        </Card>
      </div>

      <AgentTestSheet
        open={testOpen}
        onOpenChange={setTestOpen}
        agentName={agent.name}
        agentRecordId={agent.id}
        initialMode={testInitialMode}
      />
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
